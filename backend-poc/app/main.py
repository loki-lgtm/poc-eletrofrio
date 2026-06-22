"""
Motor Preditivo Eletrofrio - IA & IoT

Ponto de entrada da aplicação FastAPI. Toda a lógica de negócio foi
movida para app/services/ e as rotas para app/routers/ — aqui ficam
apenas a criação do app, middlewares, o registro dos routers e o
scheduler do monitoramento preditivo em background.

Para rodar: uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import INTERVALO_MONITORAMENTO_MIN, MONITORAMENTO_ATIVO
from app.core.logging import logger
from app.routers import dashboard, dispositivos, health, monitoramento, pipeline, whatsapp
from app.services.monitoramento import monitoramento_background_preditivo


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()

    if MONITORAMENTO_ATIVO:
        scheduler.add_job(
            monitoramento_background_preditivo,
            "interval",
            minutes=INTERVALO_MONITORAMENTO_MIN,
            id="monitoramento_preditivo",
        )
        scheduler.start()
        logger.info(
            f"[Monitor] Scheduler iniciado — ciclo a cada {INTERVALO_MONITORAMENTO_MIN} min."
        )
    else:
        logger.info("[Monitor] MONITORAMENTO_ATIVO=false — scheduler não iniciado.")

    yield

    if MONITORAMENTO_ATIVO:
        scheduler.shutdown()


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
app.include_router(monitoramento.router)
