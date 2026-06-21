"""Router: motor preditivo principal (coleta -> ML -> IA -> abertura de chamado)."""
from fastapi import APIRouter, HTTPException

from app.core.logging import logger
from app.schemas.analise import AnaliseResponse
from app.services.eletrofrio_api import (
    fetch_api,
    obter_contexto_dispositivo,
    post_abrir_chamado,
)
from app.services.ia_diagnostico import ia_diagnostico_tecnico
from app.services.ml import motor_isolation_forest
from app.services.rag import montar_contexto_rag
from app.services.sazonalidade import analisar_sazonalidade
from app.services.telemetria import processar_telemetria

router = APIRouter(tags=["Pipeline Preditivo"])


@router.post("/pipeline-completo/{dispositivo_id}", response_model=AnaliseResponse)
async def executar_pipeline_preditivo(dispositivo_id: int):
    """
    Motor Principal: Orquestra a coleta, a IA e a criação do chamado.
    """
    logger.info(f"Iniciando análise preditiva para o dispositivo {dispositivo_id}")

    # 1. Ingestão
    json_bruto = await fetch_api(route="telemetria", params={"dispositivoId": dispositivo_id})

    df = processar_telemetria(json_bruto)

    if df.empty:
        raise HTTPException(status_code=400, detail="Dados de telemetria insuficientes.")

    # Busca o contexto real (loja, nome do equipamento) na API de Alarmes
    contexto = await obter_contexto_dispositivo(dispositivo_id)

    # 2. Roda o Machine Learning SEMPRE para tentar achar a causa raiz
    resultado_ml = motor_isolation_forest(df)

    # Informação extra gerada pelo processador (se o sensor caiu no final, sazonalidade)
    horario_queda = df.attrs.get("horario_queda_sensor")
    horario_falha = resultado_ml["horario"] if resultado_ml["critico"] else (horario_queda or "00:00")
    sazonalidade_atual = analisar_sazonalidade(horario_falha)

    # CENÁRIO A: Houve Anomalia Termodinâmica (com ou sem queda de sensor depois)
    if resultado_ml["critico"]:
        resultado_ml["nome_equipamento"] = contexto["dispositivoNm"]
        rag_contexto = montar_contexto_rag(contexto["dispositivoNm"], resultado_ml)
        diagnostico = await ia_diagnostico_tecnico(
            resultado_ml, contexto["lojaNm"], sazonalidade_atual, rag_contexto
        )

        # Se o sensor caiu DEPOIS da anomalia, adiciona esse aviso ao ticket
        if horario_queda:
            diagnostico += f"\n\nALERTA: Controlador offline desde as {horario_queda}."

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

        return AnaliseResponse(
            dispositivo_id=dispositivo_id,
            status_operacao="FALHA CRÍTICA",
            tem_anomalia_critica=True,
            horario_evento=resultado_ml["horario"],
            diagnostico_ia=diagnostico,
            chamado_aberto=sucesso,
            sazonalidade=sazonalidade_atual,
            risco_perda_rs=rag_contexto["risco"]["risco_mercadoria"],
            desperdicio_energia_rs=rag_contexto["risco"]["desperdicio_energia_dia"],
        )

    # CENÁRIO B: NÃO houve Anomalia Termodinâmica, mas a telemetria parou (ex: cabo rompido/sem luz)
    if horario_queda:
        diagnostico_offline = (
            f"ALERTA: Perda de telemetria. Os sensores deixaram de reportar "
            f"valores às {horario_queda}. Possível queda de energia, falha "
            f"no CLP ou cabo rompido."
        )

        payload = {
            "equipe": "Time IA Preditiva",
            "lojaId": contexto["lojaId"],
            "lojaNome": contexto["lojaNm"],
            "dispositivoId": dispositivo_id,
            "tag": contexto["dispositivoNm"],
            "motivoIA": diagnostico_offline,
            "requerTecnico": True,
        }

        sucesso = await post_abrir_chamado(payload)

        return AnaliseResponse(
            dispositivo_id=dispositivo_id,
            status_operacao="PERDA DE TELEMETRIA",
            tem_anomalia_critica=True,
            horario_evento=horario_queda,
            diagnostico_ia=diagnostico_offline,
            chamado_aberto=sucesso,
        )

    # CENÁRIO C: TUDO NORMAL
    return AnaliseResponse(
        dispositivo_id=dispositivo_id,
        status_operacao="NORMAL",
        tem_anomalia_critica=False,
        horario_evento=None,
        diagnostico_ia="Operação dentro dos padrões termodinâmicos normais.",
        chamado_aberto=False,
    )
