"""Router: webhook de recebimento de mensagens do WhatsApp (Umbler uTalk)."""
import json

from fastapi import APIRouter, HTTPException, Request

from app.core.logging import logger
from app.services.whatsapp import enviar_mensagem_whatsapp, ia_atendimento_whatsapp, numero_autorizado

router = APIRouter(tags=["WhatsApp"])


@router.post("/webhook/whatsapp")
async def whatsapp_receptor(request: Request):
    """
    Webhook da Umbler. Recebe a mensagem do cliente, extrai o chatId,
    avança a máquina de estados e responde.
    """
    try:
        payload = await request.json()
    except Exception as exc:
        logger.error(f"Payload inválido recebido no webhook do WhatsApp: {exc}")
        raise HTTPException(status_code=400, detail="Payload inválido")

    logger.info(f"Payload recebido do uTalk: {json.dumps(payload, indent=2)}")

    dados_mensagem = payload.get("data", {})
    chave = dados_mensagem.get("key", {})

    identificador_cliente = chave.get("remoteJid")
    mensagem_cliente = dados_mensagem.get("message", {}).get("conversation")
    enviado_pelo_bot = chave.get("fromMe", False)

    if not identificador_cliente:
        identificador_cliente = payload.get("chatId")
        mensagem_cliente = payload.get("message")
        enviado_pelo_bot = payload.get("fromMe", False)

    if enviado_pelo_bot or not identificador_cliente or not mensagem_cliente:
        logger.info("Webhook ignorado: sem ID/mensagem de texto ou enviado pelo próprio bot.")
        return {"status": "ignorado"}

    if not numero_autorizado(identificador_cliente):
        logger.info(f"Webhook ignorado: {identificador_cliente} não está na allowlist de números.")
        return {"status": "ignorado_numero_nao_autorizado"}

    logger.info(f"Mensagem recebida do chat {identificador_cliente}: {mensagem_cliente}")

    try:
        resposta = ia_atendimento_whatsapp(identificador_cliente, mensagem_cliente)
    except Exception as exc:
        logger.error(f"Erro ao processar atendimento: {exc}")
        resposta = "Desculpe, tivemos uma instabilidade no atendimento. Por favor, tente novamente em alguns instantes."

    enviado = await enviar_mensagem_whatsapp(identificador_cliente, resposta)

    return {"status": "processado" if enviado else "erro_envio", "resposta_ia": resposta}
