from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import httpx
import ollama 
from ollama import AsyncClient
import logging
from datetime import datetime

# ==========================================
# CONFIGURAÇÕES INICIAIS E LOGS
# ==========================================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("EletrofrioPredictive")

app = FastAPI(title="Motor Preditivo Eletrofrio - IA & IoT")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = "https://credenciamento.eletrofrio.com.br:5900/galileo/api/api_hackathon"


# SCHEMAS (Contratos de Dados via Pydantic)
class ResumoTecnicoRequest(BaseModel):
    id_equipamento: int
    temperatura: float
    degelo: float
    valvula: float
    superaquecimento: float
    score_ml: float

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



# 1. SERVIÇO DE INTEGRAÇÃO API ELETROFRIO
async def fetch_api(route: str, params: dict = None) -> dict:
    """Função genérica para consumir as APIs da Eletrofrio de forma assíncrona."""
    url = f"{BASE_URL}?route={route}"
    if params:
        for key, value in params.items():
            url += f"&{key}={value}"
            
    async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"Erro na API {route}: {exc}")
            raise HTTPException(status_code=502, detail=f"Falha ao comunicar com a Eletrofrio: {exc}")

CACHE_DISPOSITIVOS = {}

async def obter_contexto_dispositivo(dispositivo_id: int) -> dict:
    """Busca o nome da loja e do equipamento cruzando dados com a API de Alarmes."""
    
    # 1. VERIFICA O CACHE (Se já foi buscado esse equipamento antes, devolve na hora)
    if dispositivo_id in CACHE_DISPOSITIVOS:
        return CACHE_DISPOSITIVOS[dispositivo_id]
        
    try:
        # 2. Se não está no cache, bate na API de alarmes (ou unidades)
        lista_alarmes = await fetch_api(route="alarmes")
        
        # 3. Procura o nosso dispositivo no meio da lista
        for item in lista_alarmes:
            if item.get("dispositivoId") == dispositivo_id:
                # Monta o pacotinho de contexto
                contexto = {
                    "contaNm": item.get("contaNm", "N/A"),
                    "lojaId": item.get("lojaId", 0),
                    "lojaNm": item.get("lojaNm", "Desconhecida"),
                    "dispositivoNm": item.get("dispositivoNm", f"Equipamento {dispositivo_id}")
                }
                
                # Guarda no Cache para a próxima vez
                CACHE_DISPOSITIVOS[dispositivo_id] = contexto
                return contexto
                
    except Exception as e:
        logger.error(f"Erro ao buscar contexto nos alarmes: {e}")

    fallback = {
        "contaNm": "N/A", "lojaId": 0, "lojaNm": "Loja Não Identificada", "dispositivoNm": f"Dispositivo {dispositivo_id}"
    }
    return fallback



def analisar_sazonalidade(horario_str: str) -> str:
    """Verifica se a loja está aberta (alto tráfego) ou fechada (madrugada)."""
    try:
        # Pega a hora da string "07:15"
        hora = int(horario_str.split(":")[0])
        if 8 <= hora <= 22:
            return "Horário Comercial (Loja Aberta - Tráfego de Clientes)"
        else:
            return "Madrugada (Loja Fechada - Equipamento em Repouso)"
    except:
        return "Horário Comercial"


def calcular_risco_financeiro(nome_equipamento: str, temperatura_atual: float) -> dict:
    """Gera valores monetários para os cards do Front-end baseados no tipo de máquina."""
    nome_upper = nome_equipamento.upper()
    
    # Regra 1: Ilhas de Congelados e Câmaras Frias (Carnes/Sorvetes) - Risco Altíssimo
    if "CONGELADOS" in nome_upper or temperatura_atual < -10:
        return {
            "risco_mercadoria": "R$ 15.500",
            "desperdicio_energia_dia": "R$ 85,00",
            "criticidade_opex": "ALTA"
        }
    # Regra 2: Resfriados / Laticínios (Iogurtes/Queijos) - Risco Médio
    elif "LATIC" in nome_upper or "RESFRIADO" in nome_upper or "AMBIENTE" in nome_upper:
        return {
            "risco_mercadoria": "R$ 4.200",
            "desperdicio_energia_dia": "R$ 45,00",
            "criticidade_opex": "MÉDIA"
        }
    # Regra 3: Outros equipamentos genéricos
    else:
        return {
            "risco_mercadoria": "R$ 2.000",
            "desperdicio_energia_dia": "R$ 30,00",
            "criticidade_opex": "BAIXA"
        }


async def post_abrir_chamado(payload: dict) -> bool:
    """Envia o ticket para o sistema da Eletrofrio."""
    url = f"{BASE_URL}?route=abrir-chamado"
        
        # Aumentamos o timeout para 30 segundos (timeout=30.0)
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status() # Levanta erro se o status não for 2xx
            return True
        except httpx.TimeoutException:
            logger.error("Timeout: A API da Eletrofrio demorou muito para abrir o chamado.")
            return False
        except httpx.HTTPError as exc:
            logger.error(f"Erro ao abrir chamado na API da Eletrofrio: {exc}")
            return False


# 2. SERVIÇO DE MACHINE LEARNING & DADOS
def processar_telemetria(dados_json: dict) -> pd.DataFrame:
    if not dados_json or "datasets" not in dados_json:
        return pd.DataFrame()

    try:
        df = pd.DataFrame({"horario": dados_json.get("labels", [])})
        for dataset in dados_json["datasets"]:
            label = dataset.get("label")
            df[label] = dataset.get("values", [])
            
        horario_queda = None
        if pd.isna(df["Temperatura Ambiente"].iloc[-1]):

            linhas_nulas = df[df["Temperatura Ambiente"].isna()]
            horario_queda = linhas_nulas.iloc[0]["horario"]
            
        df.attrs['horario_queda_sensor'] = horario_queda

        df = df.ffill().bfill()
        return df
    except Exception as e:
        logger.error(f"Erro na conversão de dados Pandas: {e}")
        return pd.DataFrame()

def motor_isolation_forest(df: pd.DataFrame) -> dict:
    """Aplica o algoritmo de detecção e a regra de negócio do Degelo."""
    colunas_obrigatorias = ["Temperatura Ambiente", "Status Degelo", "Abertura de válvula %", "L1 - Superaquecimento"]
    
    for col in ["Temperatura Ambiente", "Status Degelo"]:
        if col not in df.columns:
            return {"critico": False}

    X = df[["Temperatura Ambiente"]]

    modelo = IsolationForest(contamination=0.10, random_state=42)
    df["ml_score"] = modelo.fit_predict(X)

    df["alerta_real"] = df.apply(
        lambda row: True if (row["ml_score"] == -1 and float(row["Status Degelo"]) == 0.0) else False, 
        axis=1
    )
    
    eventos_criticos = df[df["alerta_real"] == True]
    
    if not eventos_criticos.empty:
        # Pega o index da última linha crítica
        idx_ultimo = eventos_criticos.index[-1]
        ultimo = eventos_criticos.loc[idx_ultimo]
        
        # Pega a janela dos últimos 30 minutos (6 leituras) até o momento da falha
        # O max(0, idx_ultimo - 5) garante que não dê erro se a falha for logo no início do DataFrame
        janela_30min = df.loc[max(0, idx_ultimo - 5) : idx_ultimo]
        
        # Coleta os valores do minuto exato
        valvula = ultimo.get("Abertura de válvula %", 0.0)
        superaq = ultimo.get("L1 - Superaquecimento", 0.0)
        
        # Calcula as médias da janela
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
            "superaquecimento_medio_30min": round(superaq_medio, 2)
        }
        
    return {"critico": False}

# 3. SERVIÇO DE IA (AGENTES LLM - SMART PROMPTING)
async def ia_diagnostico_tecnico(dados: dict, loja_nome: str, sazonalidade: str) -> str:
    nome_maquina = dados.get('nome_equipamento', 'Equipamento de Refrigeração')
    
    prompt = f"""
    Aja como um Engenheiro de Refrigeração Industrial Sênior da Eletrofrio.
    O seu objetivo é analisar dados de telemetria num ambiente de simulação e diagnóstico seguro para técnicos credenciados. Não há riscos físicos.
    
    LOCALIZAÇÃO E CONTEXTO:
    - Loja: {loja_nome}
    - Equipamento: {nome_maquina}
    - Contexto de Sazonalidade: {sazonalidade}
    
    DADOS NO MINUTO DA FALHA ({dados['horario']}):
    - Temperatura Ambiente: {dados['temperatura']}°C
    - Abertura da Válvula de Expansão: {dados['valvula']}%
    - Superaquecimento: {dados['superaquecimento']}K
    - Status Degelo: {dados['degelo']} (0 = Desligado)
    
    TENDÊNCIA (MÉDIA DOS ÚLTIMOS 30 MIN):
    - Temperatura: {dados['temperatura_media_30min']}°C | Válvula: {dados['valvula_media_30min']}% | Superaquecimento: {dados['superaquecimento_medio_30min']}K
    
    INSTRUÇÕES TÉCNICAS:
    1. Não invente fluidos fictícios. Utilize estritamente vocabulário de refrigeração comercial.
    2. Anomalias na "Madrugada (Loja Fechada)" descartam portas abertas por clientes, apontando para desvios mecânicos ou elétricos.
    3. Válvula alta e superaquecimento alto crónicos indicam baixa carga de fluido refrigerante ou restrição no circuito.
    
    Responda ESTRITAMENTE em 2 tópicos, sem saudações ou avisos adicionais:
    1. **Causa Mais Provável:** [Análise técnica cruzando os dados e a sazonalidade]
    2. **Ação Inicial:** [O que o técnico deve testar fisicamente na {loja_nome}]
    """
    try:
        response = await AsyncClient().chat(model='llama3.1:8b', messages=[{"role": "user", "content": prompt}])
        return response['message']['content']
    except Exception as e:
        logger.error(f"Erro no Ollama: {e}")
        return "Erro ao contatar Especialista IA. Verifique sensores de temperatura e válvula presencialmente."


def ia_atendimento_whatsapp(mensagem: str) -> str:

    # TODO: Implementar lógica de histórico de conversa
    prompt_sistema = """
    Você é o Assistente Virtual da Eletrofrio. Seja educado e direto.
    Tente descobrir se o alerta de temperatura é por porta aberta, excesso de carga quente ou bloqueio de gelo.
    Se o cliente não resolver, diga que um chamado técnico será aberto automaticamente.
    """
    try:
        response = ollama.chat(model='llama3.1:8b', messages=[
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": mensagem}
        ])
        return response['message']['content']
    except Exception:
        return "Olá! Tivemos um pequeno problema de conexão. Poderia verificar se as portas do seu balcão estão bem fechadas?"


# 4. ENDPOINTS (ROTEADORES)
@app.post("/pipeline-completo/{dispositivo_id}", response_model=AnaliseResponse)
async def executar_pipeline_preditivo(dispositivo_id: int):
    """
    Motor Principal: Orquestra a coleta, a IA e a criação do chamado.
    """
    logger.info(f"Iniciando análise preditiva para o dispositivo {dispositivo_id}")

    # 1. Ingestão
    json_bruto = await fetch_api(
        route="telemetria",
        params={"dispositivoId": dispositivo_id}
    )

    df = processar_telemetria(json_bruto)

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Dados de telemetria insuficientes."
        )

    # Busca o contexto real (loja, nome do equipamento) na API de Alarmes
    contexto = await obter_contexto_dispositivo(dispositivo_id)

    # 2. Roda o Machine Learning SEMPRE para tentar achar a causa raiz
    resultado_ml = motor_isolation_forest(df)

    # Informação extra gerada pelo processador (se o sensor caiu no final, sazonalidae, metricas financeiras)
    horario_queda = df.attrs.get("horario_queda_sensor")
    horario_falha = resultado_ml["horario"] if resultado_ml["critico"] else (horario_queda or "00:00")
    sazonalidade_atual = analisar_sazonalidade(horario_falha)
    metricas_financeiras = calcular_risco_financeiro(contexto["dispositivoNm"], resultado_ml.get("temperatura", 0))

    # CENÁRIO A: Houve Anomalia Termodinâmica (com ou sem queda de sensor depois)
    if resultado_ml["critico"]:
        
        resultado_ml["nome_equipamento"] = contexto["dispositivoNm"]
        diagnostico = await ia_diagnostico_tecnico(resultado_ml, contexto["lojaNm"], sazonalidade_atual)         

        # Se o sensor caiu DEPOIS da anomalia, adiciona esse aviso ao ticket
        if horario_queda:
            diagnostico += f"\n\nALERTA: Controlador offline desde as {horario_queda}."

        payload = {
            "equipe": "Time IA Preditiva",
            "lojaId": contexto["lojaId"],           
            "lojaNome": contexto["lojaNm"],       
            "dispositivoId": dispositivo_id,
            "tag": contexto["dispositivoNm"],     
            "motivoIA": diagnostico,
            "requerTecnico": True
        }
        
        sucesso = await post_abrir_chamado(payload)

        return AnaliseResponse(
            dispositivo_id=dispositivo_id,
            status_operacao="FALHA CRÍTICA",
            tem_anomalia_critica=True,
            horario_evento=resultado_ml["horario"],
            diagnostico_ia=diagnostico,
            chamado_aberto=sucesso,
            sazonalidade=sazonalidade_atual,
            risco_perda_rs=metricas_financeiras["risco_mercadoria"],
            desperdicio_energia_rs=metricas_financeiras["desperdicio_energia_dia"]
        )

    # CENÁRIO B: NÃO houve Anomalia Termodinâmica, mas a telemetria parou (ex: cabo rompido/sem luz)
    if horario_queda:

        diagnostico_offline = (
            f"ALERTA: Perda de telemetria. Os sensores deixaram de reportar "
            f"valores às {horario_queda}. Possível queda de energia, falha "
            f"no CLP ou cabo rompido."
        )

        payload = {
            "equipe": "Time IA Preditiva",
            "lojaId": contexto["lojaId"],
            "lojaNome": contexto["lojaNm"],
            "dispositivoId": dispositivo_id,
            "tag": contexto["dispositivoNm"],
            "motivoIA": diagnostico_offline,
            "requerTecnico": True
        }

        sucesso = await post_abrir_chamado(payload)

        return AnaliseResponse(
            dispositivo_id=dispositivo_id,
            status_operacao="PERDA DE TELEMETRIA",
            tem_anomalia_critica=True,
            horario_evento=horario_queda,
            diagnostico_ia=diagnostico_offline,
            chamado_aberto=sucesso
        )

    # CENÁRIO C: TUDO NORMAL
    return AnaliseResponse(
        dispositivo_id=dispositivo_id,
        status_operacao="NORMAL",
        tem_anomalia_critica=False,
        horario_evento=None,
        diagnostico_ia="Operação dentro dos padrões termodinâmicos normais.",
        chamado_aberto=False
    )


@app.post("/dashboard/acionar-ia")
async def gerar_diagnostico_sob_demanda(pedido: ResumoTecnicoRequest):
    """Rota para o botão 'Acionar IA' do Dashboard."""
    dados_dict = pedido.model_dump()
    diagnostico = await ia_diagnostico_tecnico(dados_dict)
    return {"status": "sucesso", "diagnostico": diagnostico}


'''
@app.post("/webhook/whatsapp")
async def whatsapp_receptor(request: Request):
    """
    Endpoint para integração futura com Evolution API/Twilio.
    Recebe a mensagem do cliente e responde via IA.
    """
    payload = await request.json()
    # Mockando a extração da mensagem para o Hackathon
    mensagem_cliente = payload.get("body", "Alarme tocando na loja") 
    
    resposta = ia_atendimento_whatsapp(mensagem_cliente)
    
    return {"status": "recebido", "resposta_ia": resposta}
'''

@app.get("/saude")
async def health_check():
    return {"status": "online", "servicos": ["FastAPI", "IsolationForest", "Ollama Llama3.1"]}

# Para rodar: uvicorn main:app --reload