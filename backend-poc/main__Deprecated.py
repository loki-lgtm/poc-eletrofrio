from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import httpx
from ollama import AsyncClient
import logging
import json
from pathlib import Path
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

# Integração WhatsApp (Evolution API / Umbler) 
UMBLER_API_URL = "https://app-utalk.umbler.com/api/v1/messages/"
UMBLER_API_KEY = "Eletrofrio-2026-06-12-2094-06-30--63071A27BF3847D85FC46B49B374E785290E16BCE5207E058C5905E38D6455BA"

# Estado da conversa do atendimento automático, por número de telefone
ESTADO_CONVERSA: Dict[str, int] = {}

# Base de conhecimento RAG — manuais técnicos, códigos de alarme e regras de decisão
RAG_KB_PATH = Path(__file__).parent / "data" / "manuais_tecnicos_rag.json"
with open(RAG_KB_PATH, "r", encoding="utf-8") as f:
    RAG_KB = json.load(f)


# SCHEMAS (Contratos de Dados via Pydantic)
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


def encontrar_tipo_equipamento(nome_equipamento: str) -> Optional[dict]:
    """Localiza o tipo de equipamento na base RAG a partir do nome/tag do dispositivo."""
    nome_upper = (nome_equipamento or "").upper()

    for tipo in RAG_KB.get("tipos_equipamento", []):
        if tipo["tag_exemplo"].upper() in nome_upper or tipo["nome"].upper() in nome_upper:
            return tipo

    for tipo in RAG_KB.get("tipos_equipamento", []):
        for palavra in tipo["nome"].upper().split():
            if len(palavra) > 4 and palavra in nome_upper:
                return tipo

    return None


def avaliar_alarmes(tipo_equipamento: Optional[dict], dados: dict) -> Optional[dict]:
    """Confronta a telemetria atual com os códigos de alarme da base RAG."""
    if not tipo_equipamento:
        return None

    temperatura = dados.get("temperatura", 0)
    degelo_ativo = float(dados.get("degelo", 0)) != 0.0
    set_point = tipo_equipamento["set_point_temp_c"]

    if degelo_ativo:
        return next((c for c in RAG_KB["codigos_alarme"] if c["codigo"] == "AL-10"), None)
    if temperatura > set_point + 5:
        return next((c for c in RAG_KB["codigos_alarme"] if c["codigo"] == "AL-01"), None)
    if set_point + 3 <= temperatura <= set_point + 5:
        return next((c for c in RAG_KB["codigos_alarme"] if c["codigo"] == "AL-09"), None)

    return None


def calcular_risco_financeiro(tipo_equipamento: Optional[dict], alarme: Optional[dict]) -> dict:
    """Gera valores monetários para os cards do Front-end a partir do impacto de falha da base RAG."""
    impacto = (tipo_equipamento or {}).get("impacto_falha", "")

    if impacto.startswith("CRITICO"):
        risco = {"risco_mercadoria": "R$ 15.500", "desperdicio_energia_dia": "R$ 85,00", "criticidade_opex": "ALTA"}
    elif impacto.startswith("ALTO"):
        risco = {"risco_mercadoria": "R$ 8.000", "desperdicio_energia_dia": "R$ 60,00", "criticidade_opex": "ALTA"}
    elif impacto.startswith("MEDIO"):
        risco = {"risco_mercadoria": "R$ 4.200", "desperdicio_energia_dia": "R$ 45,00", "criticidade_opex": "MÉDIA"}
    else:
        risco = {"risco_mercadoria": "R$ 2.000", "desperdicio_energia_dia": "R$ 30,00", "criticidade_opex": "BAIXA"}

    if alarme:
        risco["codigo_alarme"] = alarme["codigo"]
        risco["urgencia"] = alarme["severidade"]

    return risco


def montar_contexto_rag(nome_equipamento: str, dados: dict) -> dict:
    """Cruza equipamento + telemetria com a base de conhecimento RAG (manuais_tecnicos_rag.json)."""
    tipo = encontrar_tipo_equipamento(nome_equipamento)
    alarme = avaliar_alarmes(tipo, dados)
    risco = calcular_risco_financeiro(tipo, alarme)
    return {"tipo": tipo, "alarme": alarme, "risco": risco}


def formatar_contexto_rag(rag_contexto: Optional[dict]) -> str:
    """Monta o bloco de contexto técnico (manuais + alarmes) para o prompt da IA."""
    if not rag_contexto or not rag_contexto.get("tipo"):
        return "Nenhuma especificação técnica encontrada na base RAG para este equipamento."

    tipo = rag_contexto["tipo"]
    alarme = rag_contexto.get("alarme")

    linhas = [
        f"- Fluido refrigerante: {tipo['fluido_refrigerante']}",
        f"- Set point: {tipo['set_point_temp_c']}°C | Faixa operacional: {tipo['faixa_operacao_c']['min']}°C a {tipo['faixa_operacao_c']['max']}°C",
        f"- Normativa aplicável: {tipo['normativa']}",
        f"- Impacto de falha: {tipo['impacto_falha']}",
    ]

    if alarme:
        linhas.append(f"- Alarme identificado: {alarme['codigo']} — {alarme['nome']} (severidade {alarme['severidade']})")
        linhas.append(f"- Causas mais comuns: {', '.join(alarme['causas'][:3])}")
        if alarme.get("acoes_nivel_2_tecnico"):
            linhas.append(f"- Ações recomendadas para o técnico: {', '.join(alarme['acoes_nivel_2_tecnico'][:3])}")

    return "\n".join(linhas)


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
        if "Temperatura Ambiente" in df.columns and pd.isna(df["Temperatura Ambiente"].iloc[-1]):

            linhas_nulas = df[df["Temperatura Ambiente"].isna()]
            horario_queda = linhas_nulas.iloc[0]["horario"]

        df.attrs['horario_queda_sensor'] = horario_queda

        df = df.ffill().bfill()
        return df
    except Exception as e:
        logger.error(f"Erro na conversão de dados Pandas: {e}")
        return pd.DataFrame()

def motor_isolation_forest(df: pd.DataFrame) -> dict:
    """Aplica o algoritmo multivariado para prever esforço mecânico e anomalias."""
    colunas_obrigatorias = ["Temperatura Ambiente", "Status Degelo", "Abertura de válvula %", "L1 - Superaquecimento"]
    
    for col in colunas_obrigatorias:
        if col not in df.columns:
            return {"critico": False}

    # 1. Feature Engineering: Criar a variável Tempo para capturar Sazonalidade
    try:
        # Transforma "14:30" em 870 (minutos do dia) para o ML entender padrões de horário
        df['minutos_do_dia'] = df['horario'].apply(lambda x: int(str(x).split(':')[0]) * 60 + int(str(x).split(':')[1]))
    except:
        df['minutos_do_dia'] = 0

    # 2. Matriz Multivariada (Temperatura + Válvula + Superaquecimento + Tempo)
    X = df[["Temperatura Ambiente", "Abertura de válvula %", "L1 - Superaquecimento", "minutos_do_dia"]].copy()
    
    # Preenchimento de segurança para evitar quebra no Scikit-Learn
    X = X.ffill().bfill().fillna(0)

    modelo = IsolationForest(contamination=0.10, random_state=42)
    df["ml_score"] = modelo.fit_predict(X)

    # Regra: Anomalia estatística (qualquer uma das variáveis estourou) E não é Degelo
    df["alerta_real"] = df.apply(
        lambda row: True if (row["ml_score"] == -1 and float(row["Status Degelo"]) == 0.0) else False, 
        axis=1
    )
    
    eventos_criticos = df[df["alerta_real"] == True]
    
    if not eventos_criticos.empty:
        idx_ultimo = eventos_criticos.index[-1]
        ultimo = eventos_criticos.loc[idx_ultimo]
        
        janela_30min = df.loc[max(0, idx_ultimo - 5) : idx_ultimo]
        
        # 3. Cálculo de Degradação (A válvula está perdendo eficiência?)
        if len(janela_30min) > 1:
            valvula_inicio = janela_30min.iloc[0]["Abertura de válvula %"]
            valvula_fim = janela_30min.iloc[-1]["Abertura de válvula %"]
            if valvula_fim > valvula_inicio + 15: # Crescimento brusco de 15% na janela
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
            "tendencia_esforco": tendencia_esforco # <-- Nova métrica preditiva
        }
        
    return {"critico": False}


# 3. SERVIÇO DE IA (AGENTES LLM - SMART PROMPTING)
async def ia_diagnostico_tecnico(dados: dict, loja_nome: str, sazonalidade: str, rag_contexto: Optional[dict] = None) -> str:
    nome_maquina = dados.get('nome_equipamento', 'Equipamento de Refrigeração')
    contexto_rag_txt = formatar_contexto_rag(rag_contexto)
    tendencia = dados.get('tendencia_esforco', 'Desconhecida')

    prompt = f"""
    Aja como um Engenheiro de Refrigeração Industrial Sênior da Eletrofrio.
    O seu objetivo é realizar manutenção preditiva e evitar a perda de alimentos.

    LOCALIZAÇÃO E CONTEXTO:
    - Loja: {loja_nome}
    - Equipamento: {nome_maquina}
    - Contexto de Sazonalidade: {sazonalidade}

    DADOS NO MINUTO DO ALERTA ({dados['horario']}):
    - Temperatura Ambiente: {dados['temperatura']}°C
    - Abertura da Válvula: {dados['valvula']}%
    - Superaquecimento: {dados['superaquecimento']}K
    - Degelo: {dados['degelo']}

    ANÁLISE DE TENDÊNCIA E ESFORÇO MECÂNICO (MÉDIA 30 MIN):
    - Temperatura Média: {dados['temperatura_media_30min']}°C | Válvula Média: {dados['valvula_media_30min']}%
    - Comportamento da Válvula de Expansão: {tendencia}

    CONTEXTO TÉCNICO (RAG):
    {contexto_rag_txt}

    INSTRUÇÕES PREDITIVAS RIGOROSAS:
    1. O algoritmo identificou um padrão anômalo. Se a temperatura está dentro do Set Point, mas a válvula e o superaquecimento estão altos ou em tendência "CRESCENTE", o compressor está em sobrecarga prestes a falhar.
    2. Diagnostique preventivamente focando no tempo de vida útil restante da mercadoria e do hardware.
    
    Responda ESTRITAMENTE nestes 3 tópicos, sem introduções:
    1. **Causa Raiz Mais Provável:** [Análise técnica do desvio]
    2. **Previsão de Impacto:** [Se não houver intervenção imediata, qual será o impacto na mercadoria/hardware nas próximas horas?]
    3. **Ação Preventiva Imediata:** [Diretriz técnica para o especialista em campo]
    """
    try:
        response = await AsyncClient().chat(model='llama3.2', messages=[{"role": "user", "content": prompt}])
        return response['message']['content']
    except Exception as e:
        logger.error(f"Erro no Ollama: {e}")
        return "Erro de conexão LLM. Aja imediatamente conforme o código de alarme no painel."


# 1. ATUALIZE A FUNÇÃO DE ENVIO (Com a estrutura descoberta no Swagger)
async def enviar_mensagem_whatsapp(chat_id: str, texto: str) -> bool:
    """Envia uma mensagem de texto via API da Umbler (uTalk)."""
    
    payload = {
        "message": texto,
        "organizationId": "aituRyQ8P2Hg3b8e",
        "chatId": chat_id
    }
    
    url_correta = UMBLER_API_URL 
    headers = {
        "apikey": UMBLER_API_KEY,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url_correta, json=payload, headers=headers)
            logger.info(f"Status Code da API: {response.status_code}")
            logger.info(f"Resposta da API: {response.text}")
            response.raise_for_status()
            logger.info(f"Mensagem WhatsApp enviada com sucesso para o chat {chat_id}")
            return True
        except httpx.HTTPError as exc:
            logger.error(f"Erro ao enviar mensagem WhatsApp para {chat_id}: {exc}")
            return False


def ia_atendimento_whatsapp(numero: str, mensagem: str) -> str:
    """Máquina de estados do atendimento automático em mão dupla via WhatsApp."""
    estado_atual = ESTADO_CONVERSA.get(numero, 0)
    texto_cliente = mensagem.strip().lower()

    # Estado 0 -> Identificação
    if estado_atual == 0:
        ESTADO_CONVERSA[numero] = 1
        return (
            "Olá! Sou o Assistente Virtual da Eletrofrio. Identificamos uma variação "
            "térmica no seu equipamento. Você confirma que é o responsável técnico ou "
            "gerente desta loja? (Responda com SIM ou NÃO)"
        )

    # Estado 1 -> Triagem técnica (após confirmação)
    if estado_atual == 1:
        if texto_cliente in ("sim", "s", "yes"):
            ESTADO_CONVERSA[numero] = 2
            return (
                "Perfeito. Para me ajudar no diagnóstico: o balcão está com as portas "
                "bem fechadas ou você nota algum bloqueio de gelo no evaporador?"
            )

        ESTADO_CONVERSA.pop(numero, None)
        return (
            "Sem problemas. Vamos encaminhar o alerta para o responsável técnico "
            "cadastrado nesta loja. Obrigado pelo retorno!"
        )

    # Estado 2 -> Fechamento
    if estado_atual == 2:
        ESTADO_CONVERSA.pop(numero, None)
        return (
            "Entendido. Registrei suas observações. Se o problema persistir nos "
            "próximos minutos, nosso motor preditivo abrirá um chamado técnico "
            "automaticamente anexando o histórico do Isolation Forest."
        )

    # Fallback: reinicia o fluxo
    ESTADO_CONVERSA.pop(numero, None)
    return ia_atendimento_whatsapp(numero, mensagem)


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

    # Informação extra gerada pelo processador (se o sensor caiu no final, sazonalidade)
    horario_queda = df.attrs.get("horario_queda_sensor")
    horario_falha = resultado_ml["horario"] if resultado_ml["critico"] else (horario_queda or "00:00")
    sazonalidade_atual = analisar_sazonalidade(horario_falha)

    # CENÁRIO A: Houve Anomalia Termodinâmica (com ou sem queda de sensor depois)
    if resultado_ml["critico"]:

        resultado_ml["nome_equipamento"] = contexto["dispositivoNm"]
        rag_contexto = montar_contexto_rag(contexto["dispositivoNm"], resultado_ml)
        diagnostico = await ia_diagnostico_tecnico(resultado_ml, contexto["lojaNm"], sazonalidade_atual, rag_contexto)

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
            risco_perda_rs=rag_contexto["risco"]["risco_mercadoria"],
            desperdicio_energia_rs=rag_contexto["risco"]["desperdicio_energia_dia"]
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


@app.get("/dispositivos")
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
            "dispositivoNm": item.get("dispositivoNm", f"Dispositivo {dispositivo_id}")
        }
        CACHE_DISPOSITIVOS[dispositivo_id] = contexto

        dispositivos[dispositivo_id] = {
            "id": dispositivo_id,
            "nome": contexto["dispositivoNm"],
            "loja": contexto["lojaNm"],
            "conta": contexto["contaNm"],
        }

    return list(dispositivos.values())


@app.get("/telemetria/{dispositivo_id}")
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


@app.post("/dashboard/acionar-ia")
async def gerar_diagnostico_sob_demanda(pedido: ResumoTecnicoRequest):
    """Rota para o botão 'Acionar IA' do Dashboard."""
    horario_atual = pedido.horario or datetime.now().strftime("%H:%M")

    dados_dict = pedido.model_dump()
    dados_dict["horario"] = horario_atual
    dados_dict["temperatura_media_30min"] = pedido.temperatura
    dados_dict["valvula_media_30min"] = pedido.valvula
    dados_dict["superaquecimento_medio_30min"] = pedido.superaquecimento

    sazonalidade_atual = analisar_sazonalidade(horario_atual)
    rag_contexto = montar_contexto_rag(pedido.nome_equipamento, dados_dict)
    diagnostico = await ia_diagnostico_tecnico(dados_dict, pedido.loja_nome, sazonalidade_atual, rag_contexto)

    return {
        "status": "sucesso",
        "diagnostico": diagnostico,
        "sazonalidade": sazonalidade_atual,
        "risco_perda_rs": rag_contexto["risco"]["risco_mercadoria"],
        "desperdicio_energia_rs": rag_contexto["risco"]["desperdicio_energia_dia"],
    }


@app.post("/webhook/whatsapp")
async def whatsapp_receptor(request: Request):
    """
    Webhook da Umbler. Recebe a mensagem do cliente, extrai o chatId,
    avança a máquina de estados e responde.
    """
    try:
        payload = await request.json()
    except Exception as exc:
        logger.error(f"Payload inválido recebido no webhook do WhatsApp: {exc}")
        raise HTTPException(status_code=400, detail="Payload inválido")

    logger.info(f"Payload recebido do uTalk: {json.dumps(payload, indent=2)}")

    dados_mensagem = payload.get("data", {})
    chave = dados_mensagem.get("key", {})
    
    identificador_cliente = chave.get("remoteJid")
    mensagem_cliente = dados_mensagem.get("message", {}).get("conversation")
    enviado_pelo_bot = chave.get("fromMe", False)

    if not identificador_cliente:
        identificador_cliente = payload.get("chatId")
        mensagem_cliente = payload.get("message")
        enviado_pelo_bot = payload.get("fromMe", False)

    if enviado_pelo_bot or not identificador_cliente or not mensagem_cliente:
        logger.info("Webhook ignorado: sem ID/mensagem de texto ou enviado pelo próprio bot.")
        return {"status": "ignorado"}

    logger.info(f"Mensagem recebida do chat {identificador_cliente}: {mensagem_cliente}")

    try:
        resposta = ia_atendimento_whatsapp(identificador_cliente, mensagem_cliente)
    except Exception as exc:
        logger.error(f"Erro ao processar atendimento: {exc}")
        resposta = "Desculpe, tivemos uma instabilidade no atendimento. Por favor, tente novamente em alguns instantes."

    enviado = await enviar_mensagem_whatsapp(identificador_cliente, resposta)

    return {"status": "processado" if enviado else "erro_envio", "resposta_ia": resposta}


@app.get("/saude")
async def health_check():
    return {"status": "online", "servicos": ["FastAPI", "IsolationForest", "Ollama Llama3.1"]}

# Para rodar: uvicorn main:app --reload