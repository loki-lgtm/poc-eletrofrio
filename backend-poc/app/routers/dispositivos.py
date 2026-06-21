"""Router: listagem de dispositivos e consulta de telemetria ao vivo."""
from typing import Dict

from fastapi import APIRouter, HTTPException

from app.services.eletrofrio_api import CACHE_DISPOSITIVOS, fetch_api, obter_contexto_dispositivo
from app.services.rag import encontrar_tipo_equipamento
from app.services.telemetria import processar_telemetria

router = APIRouter(tags=["Dispositivos"])


@router.get("/dispositivos")
async def listar_dispositivos():
    """Lista os dispositivos cadastrados na API Galileo (a partir dos alarmes), para seleção no painel."""
    lista_alarmes = await fetch_api(route="alarmes")

    dispositivos: Dict[int, dict] = {}
    for item in lista_alarmes:
        dispositivo_id = item.get("dispositivoId")
        if dispositivo_id is None or dispositivo_id in dispositivos:
            continue

        contexto = {
            "contaNm": item.get("contaNm", "N/A"),
            "lojaId": item.get("lojaId", 0),
            "lojaNm": item.get("lojaNm", "Desconhecida"),
            "dispositivoNm": item.get("dispositivoNm", f"Dispositivo {dispositivo_id}"),
        }
        CACHE_DISPOSITIVOS[dispositivo_id] = contexto

        dispositivos[dispositivo_id] = {
            "id": dispositivo_id,
            "nome": contexto["dispositivoNm"],
            "loja": contexto["lojaNm"],
            "conta": contexto["contaNm"],
        }

    return list(dispositivos.values())


@router.get("/telemetria/{dispositivo_id}")
async def obter_telemetria(dispositivo_id: int):
    """Retorna a série de telemetria ao vivo de um dispositivo, vinda da API Galileo."""
    json_bruto = await fetch_api(route="telemetria", params={"dispositivoId": dispositivo_id})
    df = processar_telemetria(json_bruto)

    if df.empty:
        raise HTTPException(status_code=400, detail="Dados de telemetria insuficientes.")

    contexto = await obter_contexto_dispositivo(dispositivo_id)
    tipo_equipamento = encontrar_tipo_equipamento(contexto["dispositivoNm"])
    setpoint = tipo_equipamento["set_point_temp_c"] if tipo_equipamento else None

    col_temp = "Temperatura Ambiente" if "Temperatura Ambiente" in df.columns else None
    col_evap = next((c for c in df.columns if "Evaporador" in c), None)

    serie = []
    for _, row in df.iterrows():
        ponto = {"horario": row["horario"]}
        if col_temp:
            ponto["temp"] = row[col_temp]
        if col_evap:
            ponto["evap"] = row[col_evap]
        if setpoint is not None:
            ponto["set"] = setpoint
        serie.append(ponto)

    return {
        "dispositivo_id": dispositivo_id,
        "nome_equipamento": contexto["dispositivoNm"],
        "loja_nome": contexto["lojaNm"],
        "setpoint": setpoint,
        "data": serie,
    }
