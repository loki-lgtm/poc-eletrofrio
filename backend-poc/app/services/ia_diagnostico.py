"""Serviço de IA — agente LLM (Ollama) responsável pelo diagnóstico técnico preditivo."""
from typing import Optional

from ollama import AsyncClient

from app.config import OLLAMA_MODEL
from app.core.logging import logger
from app.services.rag import formatar_contexto_rag


async def ia_diagnostico_tecnico(
    dados: dict, loja_nome: str, sazonalidade: str, rag_contexto: Optional[dict] = None
) -> str:
    nome_maquina = dados.get("nome_equipamento", "Equipamento de Refrigeração")
    contexto_rag_txt = formatar_contexto_rag(rag_contexto)
    tendencia = dados.get("tendencia_esforco", "Desconhecida")

    horario = dados.get("horario", "N/A")
    temperatura = dados.get("temperatura", "N/A")
    valvula = dados.get("valvula", "N/A")
    superaquecimento = dados.get("superaquecimento", "N/A")
    degelo_ativo = "Sim" if float(dados.get("degelo", 0) or 0) > 0 else "Não"
    temperatura_media = dados.get("temperatura_media_30min", "N/A")
    valvula_media = dados.get("valvula_media_30min", "N/A")
    superaquecimento_medio = dados.get("superaquecimento_medio_30min", "N/A")

    score_ml = dados.get("score", dados.get("score_ml"))
    linha_score = (
        f"    - Score de Anomalia Matemática: {score_ml} (Valor -1 indica desvio grave do padrão)\n"
        if score_ml is not None
        else ""
    )

    prompt = f"""
    Aja como um Engenheiro de Refrigeração Industrial Sênior da Eletrofrio.
    O seu objetivo é realizar manutenção preditiva e direcionar o técnico de campo.

    LOCALIZAÇÃO E CONTEXTO:
    - Loja: {loja_nome}
    - Equipamento: {nome_maquina}
    - Sazonalidade: {sazonalidade}

    DADOS NO MINUTO DO ALERTA ({dados['horario']}):
    - Temperatura Ambiente: {dados['temperatura']}°C
    - Abertura da Válvula: {dados['valvula']}%
    - Superaquecimento: {dados['superaquecimento']}K
    - Degelo Ativo: {"Sim" if float(dados['degelo']) > 0 else "Não"}
    - Score de Anomalia: {dados['score']}

    ANÁLISE DE TENDÊNCIA E ESFORÇO MECÂNICO (MÉDIA 30 MIN):
    - Temperatura Média: {dados['temperatura_media_30min']}°C | Válvula Média: {dados['valvula_media_30min']}%
    - Comportamento da Válvula: {tendencia}

    CONTEXTO TÉCNICO (BASE RAG):
    {contexto_rag_txt}

    INSTRUÇÕES DE FORMATAÇÃO ESTRITA (CRÍTICO):
    1. Seja telegráfico e direto. Use linguagem técnica de chão de fábrica.
    2. MÁXIMO de 20 palavras na Causa e no Impacto. 
    3. MÁXIMO de 3 passos curtos na Ação Preventiva.
    4. PROIBIDO repetir informações.
    5. PROIBIDO adicionar saudações, conclusões ou avisos genéricos no final (ex: "É fundamental que...").

    EXEMPLO EXATO DO FORMATO E TAMANHO ESPERADO:
    **🚨 Causa Raiz Mais Provável:** Válvula de expansão travada em 90%, gerando sobrecarga mecânica e alto superaquecimento.
    **⏱️ Previsão de Impacto:** Colapso do compressor por estresse térmico em 120 minutos. Perda iminente do lote de resfriados.
    **🛠️ Ação Preventiva Imediata:** 1. Desenergizar e inspecionar o regulador da válvula de expansão.
    2. Medir superaquecimento real no manifold. 
    3. Checar possível obstrução no filtro secador.

    AGORA GERE O DIAGNÓSTICO PARA OS DADOS ATUAIS SEGUINDO ESTRITAMENTE O FORMATO DO EXEMPLO ACIMA:
    """
    try:
        logger.info(prompt)
        response = await AsyncClient().chat(
            model=OLLAMA_MODEL, messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Erro no Ollama: {e}")
        return "Erro de conexão LLM. Aja imediatamente conforme o código de alarme no painel."