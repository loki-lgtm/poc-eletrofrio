"""Router: acionamento manual da IA a partir do botão do dashboard."""
from datetime import datetime

from fastapi import APIRouter

from app.schemas.analise import ResumoTecnicoRequest
from app.services.ia_diagnostico import ia_diagnostico_tecnico
from app.services.rag import montar_contexto_rag
from app.services.sazonalidade import analisar_sazonalidade

router = APIRouter(tags=["Dashboard"])


@router.post("/dashboard/acionar-ia")
async def gerar_diagnostico_sob_demanda(pedido: ResumoTecnicoRequest):
    """Rota para o botão 'Acionar IA' do Dashboard."""
    horario_atual = pedido.horario or datetime.now().strftime("%H:%M")

    dados_dict = pedido.model_dump()
    dados_dict["horario"] = horario_atual
    dados_dict["temperatura_media_30min"] = pedido.temperatura
    dados_dict["valvula_media_30min"] = pedido.valvula
    dados_dict["superaquecimento_medio_30min"] = pedido.superaquecimento

    sazonalidade_atual = analisar_sazonalidade(horario_atual)
    rag_contexto = montar_contexto_rag(pedido.nome_equipamento, dados_dict)
    diagnostico = await ia_diagnostico_tecnico(
        dados_dict, pedido.loja_nome, sazonalidade_atual, rag_contexto
    )

    return {
        "status": "sucesso",
        "diagnostico": diagnostico,
        "sazonalidade": sazonalidade_atual,
        "risco_perda_rs": rag_contexto["risco"]["risco_mercadoria"],
        "desperdicio_energia_rs": rag_contexto["risco"]["desperdicio_energia_dia"],
    }
