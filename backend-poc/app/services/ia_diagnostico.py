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

    prompt = f"""
    Aja como um Engenheiro de Refrigeração Industrial Sênior da Eletrofrio.
    O seu objetivo é realizar manutenção preditiva, evitar a perda de alimentos e direcionar o técnico de campo.

    LOCALIZAÇÃO E CONTEXTO:
    - Loja: {loja_nome}
    - Equipamento: {nome_maquina}
    - Contexto de Sazonalidade: {sazonalidade}

    DADOS NO MINUTO DO ALERTA ({dados['horario']}):
    - Temperatura Ambiente: {dados['temperatura']}°C
    - Abertura da Válvula: {dados['valvula']}%
    - Superaquecimento: {dados['superaquecimento']}K
    - Degelo Ativo: {"Sim" if float(dados['degelo']) > 0 else "Não"}
    - Score de Anomalia Matemática: {dados['score']} (Valor -1 indica desvio grave do padrão)

    ANÁLISE DE TENDÊNCIA E ESFORÇO MECÂNICO (MÉDIA ÚLTIMOS 30 MIN):
    - Temperatura Média: {dados['temperatura_media_30min']}°C
    - Válvula Média: {dados['valvula_media_30min']}%
    - Superaquecimento Médio: {dados['superaquecimento_medio_30min']}K
    - Comportamento da Válvula de Expansão: {tendencia}

    CONTEXTO TÉCNICO (BASE RAG):
    {contexto_rag_txt}

    INSTRUÇÕES PREDITIVAS RIGOROSAS:
    1. O algoritmo matemático já validou que isto NÃO é um falso positivo. Confie nos dados.
    2. Se a temperatura está no Set Point, mas a válvula e o superaquecimento estão altos/crescentes, decrete SOBRECARGA MECÂNICA PRESTES A FALHAR.
    3. Foco na segurança alimentar: Relacione o tempo de ação com a possível condenação da mercadoria.

    Responda ESTRITAMENTE usando o formato abaixo. Não adicione saudações, não crie novos tópicos e use linguagem técnica e direta.

    **🚨 Causa Raiz Mais Provável:**
    [Sua análise técnica cruzando o esforço da válvula, temperatura e superaquecimento]

    **⏱️ Previsão de Impacto:**
    [O que acontecerá com o hardware e com os alimentos se nada for feito nas próximas horas]

    **🛠️ Ação Preventiva Imediata:**
    [Instrução exata do que o técnico deve testar ou ajustar fisicamente ao chegar na loja]
    """
    try:
        response = await AsyncClient().chat(
            model=OLLAMA_MODEL, messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Erro no Ollama: {e}")
        return "Erro de conexão LLM. Aja imediatamente conforme o código de alarme no painel."
