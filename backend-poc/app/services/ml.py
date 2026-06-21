"""Serviço de Machine Learning — detecção multivariada de anomalias (Isolation Forest)."""
import pandas as pd
from sklearn.ensemble import IsolationForest


def motor_isolation_forest(df: pd.DataFrame) -> dict:
    """Aplica o algoritmo multivariado para prever esforço mecânico e anomalias."""
    colunas_obrigatorias = [
        "Temperatura Ambiente",
        "Status Degelo",
        "Abertura de válvula %",
        "L1 - Superaquecimento",
    ]

    for col in colunas_obrigatorias:
        if col not in df.columns:
            return {"critico": False}

    # 1. Feature Engineering: criar a variável Tempo para capturar sazonalidade
    try:
        # Transforma "14:30" em 870 (minutos do dia) para o ML entender padrões de horário
        df["minutos_do_dia"] = df["horario"].apply(
            lambda x: int(str(x).split(":")[0]) * 60 + int(str(x).split(":")[1])
        )
    except Exception:
        df["minutos_do_dia"] = 0

    # 2. Matriz multivariada (Temperatura + Válvula + Superaquecimento + Tempo)
    X = df[
        ["Temperatura Ambiente", "Abertura de válvula %", "L1 - Superaquecimento", "minutos_do_dia"]
    ].copy()

    # Preenchimento de segurança para evitar quebra no scikit-learn
    X = X.ffill().bfill().fillna(0)

    modelo = IsolationForest(contamination=0.10, random_state=42)
    df["ml_score"] = modelo.fit_predict(X)

    # Regra: anomalia estatística (qualquer uma das variáveis estourou) E não é degelo
    df["alerta_real"] = df.apply(
        lambda row: True if (row["ml_score"] == -1 and float(row["Status Degelo"]) == 0.0) else False,
        axis=1,
    )

    eventos_criticos = df[df["alerta_real"] == True]  # noqa: E712

    if not eventos_criticos.empty:
        idx_ultimo = eventos_criticos.index[-1]
        ultimo = eventos_criticos.loc[idx_ultimo]

        janela_30min = df.loc[max(0, idx_ultimo - 5) : idx_ultimo]

        # 3. Cálculo de degradação (a válvula está perdendo eficiência?)
        if len(janela_30min) > 1:
            valvula_inicio = janela_30min.iloc[0]["Abertura de válvula %"]
            valvula_fim = janela_30min.iloc[-1]["Abertura de válvula %"]
            if valvula_fim > valvula_inicio + 15:  # crescimento brusco de 15% na janela
                tendencia_esforco = "CRESCENTE CRÍTICA (Perda rápida de eficiência)"
            elif valvula_fim > valvula_inicio:
                tendencia_esforco = "CRESCENTE (Sobrecarga progressiva)"
            else:
                tendencia_esforco = "ESTÁVEL / DECRESCENTE"
        else:
            tendencia_esforco = "Dados Insuficientes"

        valvula = ultimo.get("Abertura de válvula %", 0.0)
        superaq = ultimo.get("L1 - Superaquecimento", 0.0)

        temp_media = janela_30min["Temperatura Ambiente"].mean()
        valvula_media = janela_30min.get("Abertura de válvula %", pd.Series([0.0])).mean()
        superaq_medio = janela_30min.get("L1 - Superaquecimento", pd.Series([0.0])).mean()

        return {
            "critico": True,
            "horario": ultimo["horario"],
            "temperatura": ultimo["Temperatura Ambiente"],
            "degelo": ultimo["Status Degelo"],
            "valvula": valvula,
            "superaquecimento": superaq,
            "score": ultimo["ml_score"],
            "temperatura_media_30min": round(temp_media, 2),
            "valvula_media_30min": round(valvula_media, 2),
            "superaquecimento_medio_30min": round(superaq_medio, 2),
            "tendencia_esforco": tendencia_esforco,
        }

    return {"critico": False}
