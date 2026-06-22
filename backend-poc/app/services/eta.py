"""
Serviço de previsão (forecasting) por regressão linear simples.

Propositalmente NÃO usa banco de dados: opera direto sobre a janela de
telemetria que a própria API da Eletrofrio já devolve a cada chamada.
Para isso, espera receber apenas os ÚLTIMOS N pontos dessa janela (ex:
df["Temperatura Ambiente"].tail(6) para os últimos 30 min, com leituras
de 5 em 5 min) — e não o array do dia inteiro, que diluiria uma piora
recente com leituras antigas e estáveis.
"""
from typing import TypedDict

import numpy as np
import pandas as pd


class ResultadoETA(TypedDict):
    eta_minutos: float
    inclinacao: float
    r2: float
    confiavel: bool


def calcular_eta_falha(
    serie: pd.Series,
    limite_critico: float,
    intervalo_minutos: float,
    inclinacao_minima: float = 0.01,
) -> ResultadoETA:
    """
    Calcula o ETA (Estimated Time of Arrival) para `serie` cruzar
    `limite_critico`, via regressão linear simples (sem IA pesada).

    - `serie`: janela RECENTE já recortada (ex.: últimos 6 pontos).
    - `limite_critico`: valor que, se cruzado, configura risco de falha.
    - `intervalo_minutos`: intervalo entre leituras consecutivas (ex.: 5).
    - `inclinacao_minima`: abaixo disso, considera a tendência estável/decrescente
      e portanto sem risco — ajuste por variável, já que válvula (0-100%) e
      temperatura (°C) têm escalas bem diferentes.

    Retorna eta_minutos = inf quando não há tendência de alta relevante.
    """
    y = serie.dropna().astype(float).values

    if len(y) < 3:
        return {"eta_minutos": float("inf"), "inclinacao": 0.0, "r2": 0.0, "confiavel": False}

    x = np.arange(len(y))
    inclinacao, intercepto = np.polyfit(x, y, 1)

    # R² simples — só para sinalizar o quão linear/confiável é a tendência,
    # e evitar acionar a LLM por causa de ruído que parece linear por acaso.
    y_previsto = inclinacao * x + intercepto
    ss_res = float(np.sum((y - y_previsto) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    if inclinacao <= inclinacao_minima:
        # Tendência estável ou de queda: sem risco de cruzar o limite por cima.
        return {
            "eta_minutos": float("inf"),
            "inclinacao": float(inclinacao),
            "r2": float(r2),
            "confiavel": True,
        }

    valor_atual = y[-1]
    passos_ate_limite = (limite_critico - valor_atual) / inclinacao
    eta_minutos = max(0.0, passos_ate_limite * intervalo_minutos)

    return {
        "eta_minutos": float(eta_minutos),
        "inclinacao": float(inclinacao),
        "r2": float(r2),
        # Tendência com R² baixo é pouco confiável (muito ruído na janela).
        "confiavel": r2 >= 0.5,
    }
