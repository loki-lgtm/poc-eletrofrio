"""
Serviço de atendimento automático via WhatsApp (Umbler uTalk).

Responsável por:
- Enviar mensagens de texto pela API da Umbler (enviar_mensagem_whatsapp)
- Conduzir a máquina de estados da conversa (ia_atendimento_whatsapp)
- Restringir o atendimento à allowlist de números (numero_autorizado)
"""
import re
from typing import Dict

import httpx

from app.config import (
    UMBLER_API_KEY,
    UMBLER_API_URL,
    UMBLER_ORGANIZATION_ID,
    WHATSAPP_NUMEROS_PERMITIDOS,
)
from app.core.logging import logger

# Estado da conversa do atendimento automático, por número de telefone / chatId.
ESTADO_CONVERSA: Dict[str, int] = {}


def _somente_digitos(identificador: str) -> str:
    """Remove tudo que não é dígito — útil pra comparar remoteJid ("5541...@s.whatsapp.net"),
    chatId ou número puro sem se preocupar com formato/sufixo/DDI."""
    return re.sub(r"\D", "", identificador or "")


def numero_autorizado(identificador: str) -> bool:
    """Confere se o identificador (remoteJid/chatId/número) bate com algum da allowlist,
    comparando só os dígitos finais — não importa se vem com 55 (DDI) na frente ou não."""
    digitos = _somente_digitos(identificador)
    if not digitos:
        return False
    return any(digitos.endswith(_somente_digitos(n)) for n in WHATSAPP_NUMEROS_PERMITIDOS)


async def enviar_mensagem_whatsapp(chat_id: str, texto: str) -> bool:
    """Envia uma mensagem de texto via API da Umbler (uTalk)."""
    if not numero_autorizado(chat_id):
        logger.warning(f"[WhatsApp] Envio bloqueado — {chat_id} não está na allowlist {WHATSAPP_NUMEROS_PERMITIDOS}.")
        return False

    if not UMBLER_API_KEY:
        logger.error("[WhatsApp] UMBLER_API_KEY vazia — configure o .env antes de enviar mensagens de verdade.")
        return False

    payload = {
        "message": texto,
        "organizationId": UMBLER_ORGANIZATION_ID,
        "chatId": chat_id,
    }

    headers = {
        "apikey": UMBLER_API_KEY,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(UMBLER_API_URL, json=payload, headers=headers)
            logger.info(f"Status Code da API: {response.status_code}")
            logger.info(f"Resposta da API: {response.text}")
            response.raise_for_status()
            logger.info(f"Mensagem WhatsApp enviada com sucesso para o chat {chat_id}")
            return True
        except httpx.HTTPError as exc:
            logger.error(f"Erro ao enviar mensagem WhatsApp para {chat_id}: {exc}")
            return False


def ia_atendimento_whatsapp(numero: str, mensagem: str) -> str:
    """Máquina de estados do atendimento automático em mão dupla via WhatsApp."""
    estado_atual = ESTADO_CONVERSA.get(numero, 0)
    texto_cliente = mensagem.strip().lower()

    # Estado 0 -> Identificação
    if estado_atual == 0:
        ESTADO_CONVERSA[numero] = 1
        return (
            "Olá! Sou o Assistente Virtual da Eletrofrio. Identificamos uma variação "
            "térmica no seu equipamento. Você confirma que é o responsável técnico ou "
            "gerente desta loja? (Responda com SIM ou NÃO)"
        )

    # Estado 1 -> Triagem técnica (após confirmação)
    if estado_atual == 1:
        if texto_cliente in ("sim", "s", "yes"):
            ESTADO_CONVERSA[numero] = 2
            return (
                "Perfeito. Para me ajudar no diagnóstico: o balcão está com as portas "
                "bem fechadas ou você nota algum bloqueio de gelo no evaporador?"
            )

        ESTADO_CONVERSA.pop(numero, None)
        return (
            "Sem problemas. Vamos encaminhar o alerta para o responsável técnico "
            "cadastrado nesta loja. Obrigado pelo retorno!"
        )

    # Estado 2 -> Fechamento
    if estado_atual == 2:
        ESTADO_CONVERSA.pop(numero, None)
        return (
            "Entendido. Registrei suas observações. Se o problema persistir nos "
            "próximos minutos, nosso motor preditivo abrirá um chamado técnico "
            "automaticamente anexando o histórico do Isolation Forest."
        )

    # Fallback: reinicia o fluxo
    ESTADO_CONVERSA.pop(numero, None)
    return ia_atendimento_whatsapp(numero, mensagem)
