from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sklearn.ensemble import IsolationForest
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

mock_galileo_data = {
    "labels": ["00:00", "00:05", "00:10", "00:15", "00:20", "00:25", "00:30"],
    "datasets": [
        {
            "label": "Temperatura Ambiente",
            "data": [-18.0, -18.2, -17.9, -14.6, 28.1, -17.5, -18.1] # 28.1 anomalia
        },
        {
            "label": "Status Degelo",
            "data": [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0]
        }
    ]
}

@app.get("/telemetria/{dispositivo_id}")
def get_telemetria_processada(dispositivo_id: int):
    # 1. ETL
    df = pd.DataFrame({"horario": mock_galileo_data["labels"]})
    
    for dataset in mock_galileo_data["datasets"]:
        df[dataset["label"]] = dataset["data"]
        
    # 2. Detecção de Anomalias (Isolation Forest)
    X = df[["Temperatura Ambiente"]]
    
    # contamination=0.1 estima 10% de dados anomalicos
    modelo = IsolationForest(contamination=0.15, random_state=42)
    df["anomalia_score"] = modelo.fit_predict(X)
    
    # convertedo resultado do sckit para bool
    df["is_anomaly"] = df["anomalia_score"].apply(lambda x: True if x == -1 else False)
    
    # limpar o payload
    df = df.drop(columns=["anomalia_score"])
    
    return {
        "dispositivo_id": dispositivo_id,
        "status": "sucesso",
        "dados": df.to_dict(orient="records")
    }

# uvicorn main:app --reload