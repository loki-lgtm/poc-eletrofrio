"""
Configurações centrais da aplicação.

"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# Diretório base do projeto (.../app)
BASE_DIR = Path(__file__).resolve().parent

# API Eletrofrio (Galileo)
BASE_URL = os.getenv(
    "ELETROFRIO_BASE_URL",
    "https://credenciamento.eletrofrio.com.br:5900/galileo/api/api_hackathon",
)

# Integração WhatsApp (Evolution API / Umbler uTalk)
UMBLER_API_URL = os.getenv(
    "UMBLER_API_URL", "https://app-utalk.umbler.com/api/v1/messages/"
)
UMBLER_API_KEY = os.getenv("UMBLER_API_KEY", "")
UMBLER_ORGANIZATION_ID = os.getenv("UMBLER_ORGANIZATION_ID", "aituRyQ8P2Hg3b8e")

# Base de conhecimento RAG (manuais técnicos, códigos de alarme, regras de decisão)
RAG_KB_PATH = BASE_DIR / "data" / "manuais_tecnicos_rag.json"

# Modelo Ollama usado nos diagnósticos
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# ==========================================
# MONITORAMENTO PREDITIVO EM BACKGROUND (ETA por regressão linear)
# ==========================================
# Liga/desliga o scheduler sem precisar comentar código (útil em dev local).
MONITORAMENTO_ATIVO = os.getenv("MONITORAMENTO_ATIVO", "true").lower() == "true"

# Intervalo do scheduler, em minutos. Deve casar com o intervalo real de
# leitura da telemetria (5 em 5 min, conforme telemetria.json).
INTERVALO_MONITORAMENTO_MIN = int(os.getenv("INTERVALO_MONITORAMENTO_MIN", "5"))

# Quantos pontos recentes entram na regressão (6 pontos x 5 min = 30 min).
JANELA_REGRESSAO_PONTOS = int(os.getenv("JANELA_REGRESSAO_PONTOS", "6"))

# Se o ETA para o limite crítico for menor que isso (em minutos), aciona a LLM.
LIMIAR_CRITICO_MINUTOS = int(os.getenv("LIMIAR_CRITICO_MINUTOS", "60"))

# Não re-aciona a LLM/chamado pro mesmo evento antes desse cooldown (em horas).
COOLDOWN_REALERTA_HORAS = int(os.getenv("COOLDOWN_REALERTA_HORAS", "2"))

# Limite de chamadas simultâneas à API da Eletrofrio durante o ciclo de monitoramento.
MAX_CONCORRENCIA_MONITOR = int(os.getenv("MAX_CONCORRENCIA_MONITOR", "4"))
