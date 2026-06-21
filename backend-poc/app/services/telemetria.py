"""Serviço de processamento da telemetria bruta vinda da API em um DataFrame."""
import pandas as pd

from app.core.logging import logger


def processar_telemetria(dados_json: dict) -> pd.DataFrame:
    if not dados_json or "datasets" not in dados_json:
        return pd.DataFrame()

    try:
        df = pd.DataFrame({"horario": dados_json.get("labels", [])})
        for dataset in dados_json["datasets"]:
            label = dataset.get("label")
            df[label] = dataset.get("values", [])

        horario_queda = None
        if "Temperatura Ambiente" in df.columns and pd.isna(
            df["Temperatura Ambiente"].iloc[-1]
        ):
            linhas_nulas = df[df["Temperatura Ambiente"].isna()]
            horario_queda = linhas_nulas.iloc[0]["horario"]

        df.attrs["horario_queda_sensor"] = horario_queda

        df = df.ffill().bfill()
        return df
    except Exception as e:
        logger.error(f"Erro na conversão de dados Pandas: {e}")
        return pd.DataFrame()
