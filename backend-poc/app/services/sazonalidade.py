"""Serviço simples de análise de sazonalidade a partir do horário do evento."""


def analisar_sazonalidade(horario_str: str) -> str:
    """Verifica se a loja está aberta (alto tráfego) ou fechada (madrugada)."""
    try:
        # Pega a hora da string "07:15"
        hora = int(horario_str.split(":")[0])
        if 8 <= hora <= 22:
            return "Horário Comercial (Loja Aberta - Tráfego de Clientes)"
        else:
            return "Madrugada (Loja Fechada - Equipamento em Repouso)"
    except Exception:
        return "Horário Comercial"
