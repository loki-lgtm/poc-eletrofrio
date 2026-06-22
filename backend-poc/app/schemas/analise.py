"""Schemas Pydantic — contratos de dados das rotas da API."""
from typing import Optional

from pydantic import BaseModel


class ResumoTecnicoRequest(BaseModel):
    id_equipamento: int
    nome_equipamento: str = "Equipamento de Refrigeração"
    loja_nome: str = "Loja"
    temperatura: float
    degelo: float
    valvula: float
    superaquecimento: float
    score_ml: float
    horario: Optional[str] = None


class AnaliseResponse(BaseModel):
    dispositivo_id: int
    status_operacao: str
    tem_anomalia_critica: bool
    horario_evento: Optional[str]
    diagnostico_ia: str
    chamado_aberto: bool

    sazonalidade: Optional[str] = None
    risco_perda_rs: Optional[str] = None
    desperdicio_energia_rs: Optional[str] = None

    eta_minutos: Optional[float] = None
    tendencia_esforco: Optional[str] = None
    codigo_alarme: Optional[str] = None
    alarme_severidade: Optional[str] = None
