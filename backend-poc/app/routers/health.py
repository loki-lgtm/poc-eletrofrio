"""Router: health check — testa de verdade as dependências externas (Galileo, Ollama, Umbler)."""
import asyncio

import httpx
from fastapi import APIRouter

from app.config import BASE_URL, UMBLER_API_KEY
from app.core.logging import logger

router = APIRouter(tags=["Saúde"])


async def _checar_galileo() -> str:
    try:
        async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
            response = await client.get(f"{BASE_URL}?route=alarmes")
            response.raise_for_status()
        return "online"
    except Exception as e:
        logger.error(f"[Saude] Galileo indisponível: {e}")
        return "offline"


async def _checar_ollama() -> str:
    try:
        from ollama import AsyncClient

        await AsyncClient().list()
        return "online"
    except Exception as e:
        logger.error(f"[Saude] Ollama indisponível: {e}")
        return "offline"


def _checar_umbler() -> str:
    return "configurado" if UMBLER_API_KEY else "sem api key"


@router.get("/saude")
async def health_check():
    galileo, ollama_status = await asyncio.gather(_checar_galileo(), _checar_ollama())
    umbler_status = _checar_umbler()

    status_geral = "online" if galileo == "online" and ollama_status == "online" else "degradado"

    return {
        "status": status_geral,
        "servicos": {
            "fastapi": "online",
            "galileo": galileo,
            "ollama_llama": ollama_status,
            "umbler_whatsapp": umbler_status,
        },
    }
