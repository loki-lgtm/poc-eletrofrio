"""
Serviço RAG — cruza o equipamento e a telemetria com a base de conhecimento
técnica (manuais, códigos de alarme e regras de decisão) carregada de
data/manuais_tecnicos_rag.json.
"""
import json
from typing import Optional

from app.config import RAG_KB_PATH

with open(RAG_KB_PATH, "r", encoding="utf-8") as f:
    RAG_KB = json.load(f)


def encontrar_tipo_equipamento(nome_equipamento: str) -> Optional[dict]:
    """Localiza o tipo de equipamento na base RAG a partir do nome/tag do dispositivo."""
    nome_upper = (nome_equipamento or "").upper()

    for tipo in RAG_KB.get("tipos_equipamento", []):
        if tipo["tag_exemplo"].upper() in nome_upper or tipo["nome"].upper() in nome_upper:
            return tipo

    for tipo in RAG_KB.get("tipos_equipamento", []):
        for palavra in tipo["nome"].upper().split():
            if len(palavra) > 4 and palavra in nome_upper:
                return tipo

    return None


def avaliar_alarmes(tipo_equipamento: Optional[dict], dados: dict) -> Optional[dict]:
    """Confronta a telemetria atual com os códigos de alarme da base RAG."""
    if not tipo_equipamento:
        return None

    temperatura = dados.get("temperatura", 0)
    degelo_ativo = float(dados.get("degelo", 0)) != 0.0
    set_point = tipo_equipamento["set_point_temp_c"]

    if degelo_ativo:
        return next((c for c in RAG_KB["codigos_alarme"] if c["codigo"] == "AL-10"), None)
    if temperatura > set_point + 5:
        return next((c for c in RAG_KB["codigos_alarme"] if c["codigo"] == "AL-01"), None)
    if set_point + 3 <= temperatura <= set_point + 5:
        return next((c for c in RAG_KB["codigos_alarme"] if c["codigo"] == "AL-09"), None)

    return None


def calcular_risco_financeiro(tipo_equipamento: Optional[dict], alarme: Optional[dict]) -> dict:
    """Gera valores monetários para os cards do front-end a partir do impacto de falha da base RAG."""
    impacto = (tipo_equipamento or {}).get("impacto_falha", "")

    if impacto.startswith("CRITICO"):
        risco = {"risco_mercadoria": "R$ 15.500", "desperdicio_energia_dia": "R$ 85,00", "criticidade_opex": "ALTA"}
    elif impacto.startswith("ALTO"):
        risco = {"risco_mercadoria": "R$ 8.000", "desperdicio_energia_dia": "R$ 60,00", "criticidade_opex": "ALTA"}
    elif impacto.startswith("MEDIO"):
        risco = {"risco_mercadoria": "R$ 4.200", "desperdicio_energia_dia": "R$ 45,00", "criticidade_opex": "MÉDIA"}
    else:
        risco = {"risco_mercadoria": "R$ 2.000", "desperdicio_energia_dia": "R$ 30,00", "criticidade_opex": "BAIXA"}

    if alarme:
        risco["codigo_alarme"] = alarme["codigo"]
        risco["urgencia"] = alarme["severidade"]

    return risco


def montar_contexto_rag(nome_equipamento: str, dados: dict) -> dict:
    """Cruza equipamento + telemetria com a base de conhecimento RAG (manuais_tecnicos_rag.json)."""
    tipo = encontrar_tipo_equipamento(nome_equipamento)
    alarme = avaliar_alarmes(tipo, dados)
    risco = calcular_risco_financeiro(tipo, alarme)
    return {"tipo": tipo, "alarme": alarme, "risco": risco}


def formatar_contexto_rag(rag_contexto: Optional[dict]) -> str:
    """Monta o bloco de contexto técnico (manuais + alarmes) para o prompt da IA."""
    if not rag_contexto or not rag_contexto.get("tipo"):
        return "Nenhuma especificação técnica encontrada na base RAG para este equipamento."

    tipo = rag_contexto["tipo"]
    alarme = rag_contexto.get("alarme")

    linhas = [
        f"- Fluido refrigerante: {tipo['fluido_refrigerante']}",
        f"- Set point: {tipo['set_point_temp_c']}°C | Faixa operacional: {tipo['faixa_operacao_c']['min']}°C a {tipo['faixa_operacao_c']['max']}°C",
        f"- Normativa aplicável: {tipo['normativa']}",
        f"- Impacto de falha: {tipo['impacto_falha']}",
    ]

    if alarme:
        linhas.append(f"- Alarme identificado: {alarme['codigo']} — {alarme['nome']} (severidade {alarme['severidade']})")
        linhas.append(f"- Causas mais comuns: {', '.join(alarme['causas'][:3])}")
        if alarme.get("acoes_nivel_2_tecnico"):
            linhas.append(f"- Ações recomendadas para o técnico: {', '.join(alarme['acoes_nivel_2_tecnico'][:3])}")

    return "\n".join(linhas)
