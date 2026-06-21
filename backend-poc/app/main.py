"""
Motor Preditivo Eletrofrio - IA & IoT

Ponto de entrada da aplicação

Para rodar: uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import dashboard, dispositivos, health, pipeline, whatsapp

app = FastAPI(title="Motor Preditivo Eletrofrio - IA & IoT")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline.router)
app.include_router(dispositivos.router)
app.include_router(dashboard.router)
app.include_router(whatsapp.router)
app.include_router(health.router)
