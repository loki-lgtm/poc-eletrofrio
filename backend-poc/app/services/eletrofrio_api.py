"""
Serviço de integração com a API Eletrofrio (Galileo).

Responsável por:
- Buscar dados genéricos de qualquer rota da API (fetch_api)
- Abrir chamados técnicos (post_abrir_chamado)
- Resolver o contexto (loja, nome do equipamento) de um dispositivo,
  com cache em memória (obter_contexto_dispositivo)
"""
from typing import Dict, Optional

import httpx

from app.config import BASE_URL
from app.core.logging import logger

# Cache em memória do contexto (loja/equipamento) de cada dispositivo.
# Em produção com múltiplas instâncias, considere mover para Redis.
CACHE_DISPOSITIVOS: Dict[int, dict] = {}


async def fetch_api(route: str, params: Optional[dict] = None) -> dict:
    """Função genérica para consumir as APIs da Eletrofrio de forma assíncrona."""
    from fastapi import HTTPException  # import local evita ciclo de import

    url = f"{BASE_URL}?route={route}"
    if params:
        for key, value in params.items():
            url += f"&{key}={value}"

    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"Erro na API {route}: {exc}")
            raise HTTPException(
                status_code=502, detail=f"Falha ao comunicar com a Eletrofrio: {exc}"
            )


async def post_abrir_chamado(payload: dict) -> bool:
    """Envia o ticket para o sistema da Eletrofrio."""
    url = f"{BASE_URL}?route=abrir-chamado"

    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return True
        except httpx.TimeoutException:
            logger.error("Timeout: A API da Eletrofrio demorou muito para abrir o chamado.")
            return False
        except httpx.HTTPError as exc:
            logger.error(f"Erro ao abrir chamado na API da Eletrofrio: {exc}")
            return False


async def obter_contexto_dispositivo(dispositivo_id: int) -> dict:
    """Busca o nome da loja e do equipamento cruzando dados com a API de Alarmes."""

    # 1. Verifica o cache (se já foi buscado esse equipamento antes, devolve na hora)
    if dispositivo_id in CACHE_DISPOSITIVOS:
        return CACHE_DISPOSITIVOS[dispositivo_id]

    try:
        # 2. Se não está no cache, bate na API de alarmes (ou unidades)
        lista_alarmes = await fetch_api(route="alarmes")

        # 3. Procura o nosso dispositivo no meio da lista
        for item in lista_alarmes:
            if item.get("dispositivoId") == dispositivo_id:
                contexto = {
                    "contaNm": item.get("contaNm", "N/A"),
                    "lojaId": item.get("lojaId", 0),
                    "lojaNm": item.get("lojaNm", "Desconhecida"),
                    "dispositivoNm": item.get("dispositivoNm", f"Equipamento {dispositivo_id}"),
                }

                # Guarda no cache para a próxima vez
                CACHE_DISPOSITIVOS[dispositivo_id] = contexto
                return contexto

    except Exception as e:
        logger.error(f"Erro ao buscar contexto nos alarmes: {e}")

    fallback = {
        "contaNm": "N/A",
        "lojaId": 0,
        "lojaNm": "Loja Não Identificada",
        "dispositivoNm": f"Dispositivo {dispositivo_id}",
    }
    return fallback
