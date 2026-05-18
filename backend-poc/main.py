from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

mock_galileo_db = {
    "10101": { # CENÁRIO 1: Operação 100% Normal
        "labels": ["00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45"],
        "datasets": [
            {"label": "Temperatura Ambiente", "data": [-18.0, -18.1, -17.9, -18.0, -17.8, -18.2, -18.0, -18.1, -17.9, -18.0]},
            {"label": "Status Degelo", "data": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}
        ]
    },
    "20202": { # CENÁRIO 2: Degelo Normal (Esquenta, mas o degelo está ativo)
        "labels": ["00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45"],
        "datasets": [
            {"label": "Temperatura Ambiente", "data": [-18.0, -18.1, -15.0, -5.0, 2.0, 5.0, 2.0, -5.0, -15.0, -18.0]},
            {"label": "Status Degelo", "data": [0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]}
        ]
    },
    "30663": { # CENÁRIO 3: Anomalia Crítica (Apenas UM pico isolado)
        "labels": ["00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30", "00:35", "00:40", "00:45"],
        "datasets": [
            {"label": "Temperatura Ambiente", "data": [-18.0, -18.1, -17.9, -18.0, -18.2, -17.8, 28.1, -17.5, -18.1, -17.9]},
            {"label": "Status Degelo", "data": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]}
        ]
    }
}

@app.get("/telemetria/{dispositivo_id}")
def get_telemetria_processada(dispositivo_id: str):
    if dispositivo_id not in mock_galileo_db:
        return {"erro": "Dispositivo não encontrado"}

    dados_brutos = mock_galileo_db[dispositivo_id]
    df = pd.DataFrame({"horario": dados_brutos["labels"]})
    
    for dataset in dados_brutos["datasets"]:
        df[dataset["label"]] = dataset["data"]
        
    X = df[["Temperatura Ambiente"]]
    
    modelo = IsolationForest(contamination=0.15, random_state=42)
    df["anomalia_score"] = modelo.fit_predict(X)
    
    df["is_anomaly"] = df.apply(
        lambda row: True if (row["anomalia_score"] == -1 and row["Status Degelo"] == 0.0) else False, 
        axis=1
    )
    
    df = df.drop(columns=["anomalia_score"])
    
    return {
        "dispositivo_id": dispositivo_id,
        "status": "sucesso",
        "dados": df.to_dict(orient="records")
    }



class AlertaRequest(BaseModel):
    temperatura: float
    status_degelo: float
    horario: str

@app.post("/diagnostico-ia")
def gerar_diagnostico_rag(alerta: AlertaRequest):
    if alerta.temperatura > 5.0 and alerta.status_degelo == 0.0:
        resposta_llm = (
            f"Análise Crítica via RAG (Filtrado para peças específicas deste balcão):\n\n"
            f"Identifiquei que às {alerta.horario} a temperatura atingiu {alerta.temperatura}°C fora do período de degelo.\n\n"
            f"Ação Recomendada (Nível 1): Consultando o manual da Válvula de Expansão e do Motor Ventilador instalados "
            f"nesta unidade específica, o comportamento indica obstrução severa de gelo no evaporador ou porta deixada "
            f"aberta pelo cliente.\n\nChamado técnico autônomo engatilhado no Jira para intervenção."
        )
    elif alerta.temperatura > -15.0 and alerta.status_degelo == 0.0:
        resposta_llm = (
            f"A temperatura subiu para {alerta.temperatura}°C (acima do setpoint de -18°C), mas ainda "
            f"não atingiu o limite crítico para perda de mercadoria. Recomenda-se acompanhamento nas próximas 2 horas."
        )
    else:
        resposta_llm = "Oscilação térmica detectada, mas os algoritmos indicam que está dentro dos parâmetros de segurança do manual da fabricante."

    return {
        "status": "sucesso",
        "diagnostico_rag": resposta_llm,
        "fonte_utilizada": "Testes"
    }

# uvicorn main:app --reload