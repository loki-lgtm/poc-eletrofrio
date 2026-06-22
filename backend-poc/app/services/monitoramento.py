"""
Monitoramento preditivo em background — o "módulo fantasma".

Roda periodicamente (via APScheduler, configurado em app/main.py), em
paralelo às rotas que o front-end já consome, sem alterá-las. Para cada
dispositivo:

  1. Busca a telemetria (GET, mesma rota que a rotina sob-demanda usa).
  2. Calcula o ETA até o limite crítico de temperatura por regressão
     linear simples (sem custo de LLM) — ver app/services/eta.py.
  3. Só aciona a LLM e abre chamado se o ETA estiver dentro do limiar
     crítico configurado.
  4. Usa um estado em memória (ESTADO_MONITORAMENTO) para não repetir o
     mesmo alerta/chamado a cada ciclo enquanto o problema persiste —
     isso é o único "estado" que esse módulo guarda, e propositalmente
     não é persistido em disco (reseta a cada restart, o que é aceitável
     nesta fase de testes).
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional

import pandas as pd

from app.config import (
    COOLDOWN_REALERTA_HORAS,
    INTERVALO_MONITORAMENTO_MIN,
    JANELA_REGRESSAO_PONTOS,
    LIMIAR_CRITICO_MINUTOS,
    MAX_CONCORRENCIA_MONITOR,
)
from app.core.logging import logger
from app.services.eletrofrio_api import (
    fetch_api,
    obter_contexto_dispositivo,
    post_abrir_chamado,
)
from app.services.eta import calcular_eta_falha
from app.services.ia_diagnostico import ia_diagnostico_tecnico
from app.services.rag import encontrar_tipo_equipamento, montar_contexto_rag
from app.services.sazonalidade import analisar_sazonalidade
from app.services.telemetria import processar_telemetria

_semaforo = asyncio.Semaphore(MAX_CONCORRENCIA_MONITOR)

# Estado em memória por dispositivo: {"estado": "ok"|"atencao"|"critico", "ultimo_alerta": datetime|None}
ESTADO_MONITORAMENTO: Dict[int, dict] = {}


def _valor_seguro(df: pd.DataFrame, coluna: str, default: float = 0.0):
    return df[coluna].iloc[-1] if coluna in df.columns else default


def _media_segura(df: pd.DataFrame, coluna: str, janela: int, default: float = 0.0):
    return df[coluna].tail(janela).mean() if coluna in df.columns else default


async def _listar_dispositivos_ids() -> list:
    lista_alarmes = await fetch_api(route="alarmes")
    ids = {item.get("dispositivoId") for item in lista_alarmes if item.get("dispositivoId") is not None}
    return list(ids)


async def _disparar_diagnostico_preditivo(
    dispositivo_id: int, contexto: dict, df: pd.DataFrame, eta_minutos: float, r2: float
) -> None:
    """Monta o contexto, chama a LLM e abre o chamado para um evento crítico."""
    dados_para_ia = {
        "nome_equipamento": contexto["dispositivoNm"],
        "horario": df["horario"].iloc[-1],
        "temperatura": _valor_seguro(df, "Temperatura Ambiente"),
        "valvula": _valor_seguro(df, "Abertura de válvula %"),
        "superaquecimento": _valor_seguro(df, "L1 - Superaquecimento"),
        "degelo": _valor_seguro(df, "Status Degelo"),
        "temperatura_media_30min": round(_media_segura(df, "Temperatura Ambiente", JANELA_REGRESSAO_PONTOS), 2),
        "valvula_media_30min": round(_media_segura(df, "Abertura de válvula %", JANELA_REGRESSAO_PONTOS), 2),
        "superaquecimento_medio_30min": round(_media_segura(df, "L1 - Superaquecimento", JANELA_REGRESSAO_PONTOS), 2),
        "tendencia_esforco": (
            f"PREVISÃO (regressão linear): ETA para o limite crítico de "
            f"{eta_minutos:.0f} minutos, R²={r2:.2f}."
        ),
    }

    sazonalidade_atual = analisar_sazonalidade(dados_para_ia["horario"])
    rag_contexto = montar_contexto_rag(contexto["dispositivoNm"], dados_para_ia)
    diagnostico = await ia_diagnostico_tecnico(
        dados_para_ia, contexto["lojaNm"], sazonalidade_atual, rag_contexto
    )
    diagnostico = f"[ALERTA PREDITIVO] ETA estimado para falha: {eta_minutos:.0f} minutos.\n\n{diagnostico}"

    payload = {
        "equipe": "Time IA Preditiva",
        "lojaId": contexto["lojaId"],
        "lojaNome": contexto["lojaNm"],
        "dispositivoId": dispositivo_id,
        "tag": contexto["dispositivoNm"],
        "motivoIA": diagnostico,
        "requerTecnico": True,
    }
    sucesso = await post_abrir_chamado(payload)
    logger.warning(
        f"[Monitor] Chamado {'aberto' if sucesso else 'FALHOU ao abrir'} "
        f"para {contexto['dispositivoNm']} (ETA {eta_minutos:.0f} min)."
    )


async def _avaliar_dispositivo(dispositivo_id: int) -> None:
    async with _semaforo:
        try:
            json_bruto = await fetch_api(route="telemetria", params={"dispositivoId": dispositivo_id})
        except Exception as e:
            logger.error(f"[Monitor] Falha ao buscar telemetria do dispositivo {dispositivo_id}: {e}")
            return

    df = processar_telemetria(json_bruto)
    if df.empty or "Temperatura Ambiente" not in df.columns:
        return

    contexto = await obter_contexto_dispositivo(dispositivo_id)
    tipo_equipamento = encontrar_tipo_equipamento(contexto["dispositivoNm"])

    if not tipo_equipamento:
        logger.info(f"[Monitor] {contexto['dispositivoNm']}: sem especificação RAG, pulando ETA.")
        return

    # Mesmo limite usado pelo alarme AL-01 (set point + 5°C) — não inventamos
    # um limite numérico novo aqui, reaproveitamos a regra técnica já validada.
    limite_critico = tipo_equipamento["set_point_temp_c"] + 5

    resultado_eta = calcular_eta_falha(
        serie=df["Temperatura Ambiente"].tail(JANELA_REGRESSAO_PONTOS),
        limite_critico=limite_critico,
        intervalo_minutos=INTERVALO_MONITORAMENTO_MIN,
    )

    eta_min = resultado_eta["eta_minutos"]
    nome = contexto["dispositivoNm"]
    estado_anterior = ESTADO_MONITORAMENTO.get(dispositivo_id, {"estado": "ok", "ultimo_alerta": None})

    if eta_min == float("inf"):
        logger.info(f"[Monitor] {nome}: ETA infinito (seguro).")
        ESTADO_MONITORAMENTO[dispositivo_id] = {"estado": "ok", "ultimo_alerta": estado_anterior.get("ultimo_alerta")}
        return

    if not resultado_eta["confiavel"]:
        logger.info(f"[Monitor] {nome}: tendência de alta mas pouco confiável (R²={resultado_eta['r2']:.2f}), ignorando.")
        return

    if eta_min > LIMIAR_CRITICO_MINUTOS:
        logger.info(f"[Monitor] {nome}: tendência de alta, ETA {eta_min:.0f} min. Não crítico, ignorando IA.")
        ESTADO_MONITORAMENTO[dispositivo_id] = {"estado": "atencao", "ultimo_alerta": estado_anterior.get("ultimo_alerta")}
        return

    # ETA dentro do limiar crítico — verifica cooldown antes de acionar a IA de novo.
    agora = datetime.now()
    ultimo_alerta: Optional[datetime] = estado_anterior.get("ultimo_alerta")
    if ultimo_alerta and (agora - ultimo_alerta) < timedelta(hours=COOLDOWN_REALERTA_HORAS):
        logger.info(
            f"[Monitor] {nome}: ETA CRÍTICO ({eta_min:.0f} min), mas já alertado "
            f"há menos de {COOLDOWN_REALERTA_HORAS}h. Ignorando para não duplicar chamado."
        )
        return

    logger.warning(f"[Monitor] {nome}: ETA CRÍTICO de {eta_min:.0f} min! Acionando agente LLM...")
    await _disparar_diagnostico_preditivo(dispositivo_id, contexto, df, eta_min, resultado_eta["r2"])
    ESTADO_MONITORAMENTO[dispositivo_id] = {"estado": "critico", "ultimo_alerta": agora}


async def monitoramento_background_preditivo() -> None:
    """Job do scheduler: avalia todos os dispositivos, com concorrência limitada."""
    logger.info("[Monitor] Iniciando ciclo de monitoramento preditivo...")
    try:
        dispositivos_ids = await _listar_dispositivos_ids()
    except Exception as e:
        logger.error(f"[Monitor] Falha ao listar dispositivos: {e}")
        return

    await asyncio.gather(*(_avaliar_dispositivo(did) for did in dispositivos_ids))
    logger.info(f"[Monitor] Ciclo concluído para {len(dispositivos_ids)} dispositivo(s).")
