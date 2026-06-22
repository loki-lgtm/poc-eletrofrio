"""
Router: status de monitoramento preditivo.

`/monitoramento/status` reaproveita a mesma classificação por ETA do
scheduler em background (app/services/monitoramento.py), mas SOB-DEMANDA —
não aciona a LLM nem abre chamado, é só leitura/visualização (consulta a
Galileo de novo, então demora alguns segundos).

`/monitoramento/agenda` é diferente: não toca a Galileo, só lê o estado em
memória do ciclo automático real (ESTADO_CICLO em app/services/monitoramento.py)
— pensado pra ser chamado com frequência (ex: a cada poucos segundos) pra
alimentar um countdown no front sem custo de rede.
"""
import asyncio
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter

from app.config import INTERVALO_MONITORAMENTO_MIN, JANELA_REGRESSAO_PONTOS, LIMIAR_CRITICO_MINUTOS, MAX_CONCORRENCIA_MONITOR
from app.core.logging import logger
from app.services import monitoramento as monitoramento_service
from app.services.eletrofrio_api import fetch_api, obter_contexto_dispositivo
from app.services.eta import calcular_eta_falha
from app.services.rag import encontrar_tipo_equipamento
from app.services.telemetria import processar_telemetria

router = APIRouter(tags=["Monitoramento"])

_semaforo = asyncio.Semaphore(MAX_CONCORRENCIA_MONITOR)


async def _listar_dispositivos_ids() -> list:
    lista_alarmes = await fetch_api(route="alarmes")
    ids = {item.get("dispositivoId") for item in lista_alarmes if item.get("dispositivoId") is not None}
    return sorted(ids)


async def _classificar_dispositivo(dispositivo_id: int) -> dict:
    async with _semaforo:
        try:
            json_bruto = await fetch_api(route="telemetria", params={"dispositivoId": dispositivo_id})
        except Exception as e:
            logger.error(f"[MonitorStatus] Falha ao buscar telemetria de {dispositivo_id}: {e}")
            return {"dispositivo_id": dispositivo_id, "nome": f"Dispositivo {dispositivo_id}", "estado": "erro", "eta_minutos": None}

    contexto = await obter_contexto_dispositivo(dispositivo_id)
    nome = contexto["dispositivoNm"]

    df = processar_telemetria(json_bruto)
    if df.empty or "Temperatura Ambiente" not in df.columns:
        return {"dispositivo_id": dispositivo_id, "nome": nome, "loja": contexto["lojaNm"], "estado": "sem_dados", "eta_minutos": None}

    tipo_equipamento = encontrar_tipo_equipamento(nome)
    if not tipo_equipamento:
        return {"dispositivo_id": dispositivo_id, "nome": nome, "loja": contexto["lojaNm"], "estado": "sem_especificacao", "eta_minutos": None}

    limite_critico = tipo_equipamento["set_point_temp_c"] + 5
    resultado_eta = calcular_eta_falha(
        serie=df["Temperatura Ambiente"].tail(JANELA_REGRESSAO_PONTOS),
        limite_critico=limite_critico,
        intervalo_minutos=INTERVALO_MONITORAMENTO_MIN,
    )
    eta_min: Optional[float] = resultado_eta["eta_minutos"]

    if eta_min == float("inf") or not resultado_eta["confiavel"]:
        estado = "ok"
        eta_min = None
    elif eta_min > LIMIAR_CRITICO_MINUTOS:
        estado = "atencao"
    else:
        estado = "critico"

    return {
        "dispositivo_id": dispositivo_id,
        "nome": nome,
        "loja": contexto["lojaNm"],
        "estado": estado,
        "eta_minutos": round(eta_min, 1) if eta_min is not None else None,
    }


@router.get("/monitoramento/status")
async def status_monitoramento():
    """Classifica todos os dispositivos (ok/atencao/critico/sem_dados/sem_especificacao/erro) por ETA até o limite crítico."""
    ids = await _listar_dispositivos_ids()
    resultados = await asyncio.gather(*(_classificar_dispositivo(d) for d in ids))

    resumo = {"ok": 0, "atencao": 0, "critico": 0, "sem_dados": 0, "sem_especificacao": 0, "erro": 0}
    for r in resultados:
        resumo[r["estado"]] = resumo.get(r["estado"], 0) + 1

    return {"total": len(resultados), "resumo": resumo, "dispositivos": resultados}


@router.get("/monitoramento/agenda")
async def agenda_monitoramento():
    """Estado do ciclo automático em background — leitura instantânea, sem chamar a API Galileo."""
    estado = monitoramento_service.ESTADO_CICLO

    proxima_execucao = None
    if estado["scheduler_ativo"] and estado["ultimo_inicio"]:
        proxima_execucao = estado["ultimo_inicio"] + timedelta(minutes=INTERVALO_MONITORAMENTO_MIN)

    return {
        "scheduler_ativo": estado["scheduler_ativo"],
        "intervalo_minutos": INTERVALO_MONITORAMENTO_MIN,
        "ultimo_inicio": estado["ultimo_inicio"].isoformat() if estado["ultimo_inicio"] else None,
        "ultimo_fim": estado["ultimo_fim"].isoformat() if estado["ultimo_fim"] else None,
        "proxima_execucao": proxima_execucao.isoformat() if proxima_execucao else None,
        "ultimo_erro": estado["ultimo_erro"],
        "dispositivos_avaliados": estado["dispositivos_avaliados"],
    }
