"""
Configurações centrais da aplicação.

"""
import os
from pathlib import Path

# Tenta carregar um .env na raiz do projeto, se python-dotenv estiver instalado.
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
