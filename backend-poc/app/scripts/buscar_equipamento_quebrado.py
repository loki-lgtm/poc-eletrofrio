"""
Modo 1 (dados reais): varre todos os dispositivos da API da Eletrofrio e
classifica cada um, pra você achar rápido um equipamento com uma falha
termodinâmica REAL — sem precisar testar ID por ID no Swagger.

Modo 2 (dados mockados): roda a MESMA pipeline (Isolation Forest -> RAG ->
diagnóstico da LLM) sobre um cenário de falha fabricado no próprio código
(MOCK_TELEMETRIA, lá embaixo), sem precisar de um equipamento real quebrado
agora. O resultado sai igual ao que apareceria no front-end via
/pipeline-completo — só que SEM abrir chamado de verdade, em nenhum dos
dois modos. --- NÃO TA FUNCIONANDO N SEI PQ

Uso (a partir da raiz do projeto):
     python -m app.scripts.buscar_equipamento_quebrado
"""
import asyncio
from dataclasses import dataclass
from typing import List, Optional

from app.config import INTERVALO_MONITORAMENTO_MIN, JANELA_REGRESSAO_PONTOS, MAX_CONCORRENCIA_MONITOR
from app.services.eletrofrio_api import fetch_api, obter_contexto_dispositivo
from app.services.eta import calcular_eta_falha
from app.services.ia_diagnostico import ia_diagnostico_tecnico
from app.services.ml import motor_isolation_forest
from app.services.rag import avaliar_alarmes, encontrar_tipo_equipamento, montar_contexto_rag
from app.services.sazonalidade import analisar_sazonalidade
from app.services.telemetria import processar_telemetria

_semaforo = asyncio.Semaphore(MAX_CONCORRENCIA_MONITOR)


# ============================================================================
# DADOS MOCKADOS — edite aqui pra simular outro cenário de falha.
# O formato do MOCK_TELEMETRIA é EXATAMENTE o mesmo que a rota /telemetria
# da Eletrofrio devolve (labels + datasets).
#
# IMPORTANTE: "dispositivoNm" precisa casar com a tag_exemplo/nome de algum
# tipo de equipamento no SEU app/data/manuais_tecnicos_rag.json real —
# senão o RAG não encontra o set_point e a pipeline não calcula alarme/ETA.
# ============================================================================
MOCK_DISPOSITIVO_ID = 999999
MOCK_CONTEXTO = {
    "contaNm": "Conta Demo",
    "lojaId": 1,
    "lojaNm": "Loja Demo (mock)",
    "dispositivoNm": "CAM-CONG-01",
}
MOCK_TELEMETRIA = {
    "labels": ["08:00", "08:05", "08:10", "08:15", "08:20", "08:25"],
    "datasets": [
        {"label": "Temperatura Ambiente", "values": [-8, -6, -3, 0, 3, 6]},
        {"label": "Status Degelo", "values": [0, 0, 0, 0, 0, 0]},
        {"label": "Abertura de válvula %", "values": [45, 55, 65, 75, 85, 95]},
        {"label": "L1 - Superaquecimento", "values": [9, 11, 13, 16, 19, 22]},
    ],
}


@dataclass
class ResultadoDispositivo:
    dispositivo_id: int
    nome: str
    loja: str
    status: str  # "ANOMALIA_REAL" | "PERDA_DE_SENSOR" | "NORMAL" | "SEM_DADOS" | "ERRO"
    detalhe: str = ""
    eta_minutos: Optional[float] = None
    codigo_alarme: Optional[str] = None
    diagnostico_ia: Optional[str] = None


def _formatar_eta(eta_minutos: Optional[float]) -> str:
    if eta_minutos is None:
        return "-"
    if eta_minutos == float("inf"):
        return "sem ETA"
    return f"{eta_minutos:.0f} min"


# ----------------------------------------------------------------------------
# Núcleo da pipeline, compartilhado pelos dois modos — é a mesma sequência
# da rota /pipeline-completo (motor_isolation_forest -> RAG -> LLM), só que
# SEM chamar post_abrir_chamado em nenhum momento.
# ----------------------------------------------------------------------------
async def _classificar_e_diagnosticar(
    dispositivo_id: int, nome: str, loja: str, json_bruto: dict, gerar_diagnostico_llm: bool
) -> ResultadoDispositivo:
    df = processar_telemetria(json_bruto)

    if df.empty:
        return ResultadoDispositivo(dispositivo_id, nome, loja, "SEM_DADOS", "Telemetria vazia ou insuficiente.")

    # Perda de sensor tem prioridade sobre o Isolation Forest (ver script
    # anterior — o ffill/bfill esconde a queda de sensor do modelo).
    horario_queda = df.attrs.get("horario_queda_sensor")
    if horario_queda:
        return ResultadoDispositivo(
            dispositivo_id, nome, loja, "PERDA_DE_SENSOR", f"Sensor offline desde {horario_queda}."
        )

    resultado_ml = motor_isolation_forest(df)
    if not resultado_ml["critico"]:
        return ResultadoDispositivo(dispositivo_id, nome, loja, "NORMAL", "Operação dentro do padrão.")

    tipo = encontrar_tipo_equipamento(nome)
    alarme = avaliar_alarmes(tipo, resultado_ml)

    if not alarme:
        return ResultadoDispositivo(
            dispositivo_id, nome, loja, "NORMAL",
            "Anomalia estatística do Isolation Forest, mas sem alarme RAG correspondente "
            "(provável ruído do modelo em janela pequena, não falha real).",
        )

    codigo = alarme["codigo"]
    if codigo == "AL-10":
        return ResultadoDispositivo(
            dispositivo_id, nome, loja, "NORMAL",
            "Anomalia estatística, mas é só degelo ativo (AL-10) — não é falha real.",
            codigo_alarme=codigo,
        )

    eta_min = None
    if tipo and "Temperatura Ambiente" in df.columns:
        limite_critico = tipo["set_point_temp_c"] + 5
        resultado_eta = calcular_eta_falha(
            df["Temperatura Ambiente"].tail(JANELA_REGRESSAO_PONTOS),
            limite_critico=limite_critico,
            intervalo_minutos=INTERVALO_MONITORAMENTO_MIN,
        )
        eta_min = resultado_eta["eta_minutos"]

    diagnostico = None
    if gerar_diagnostico_llm:
        resultado_ml["nome_equipamento"] = nome
        rag_contexto = montar_contexto_rag(nome, resultado_ml)
        sazonalidade_atual = analisar_sazonalidade(resultado_ml["horario"])
        diagnostico = await ia_diagnostico_tecnico(resultado_ml, loja, sazonalidade_atual, rag_contexto)

    return ResultadoDispositivo(
        dispositivo_id, nome, loja, "ANOMALIA_REAL",
        f"Tendência: {resultado_ml.get('tendencia_esforco', 'N/A')}",
        eta_minutos=eta_min,
        codigo_alarme=codigo,
        diagnostico_ia=diagnostico,
    )


# ----------------------------------------------------------------------------
# MODO 1 — varre todos os dispositivos reais
# ----------------------------------------------------------------------------
async def _listar_dispositivos_ids() -> List[int]:
    lista_alarmes = await fetch_api(route="alarmes")
    ids = {item.get("dispositivoId") for item in lista_alarmes if item.get("dispositivoId") is not None}
    return sorted(ids)


async def _analisar_dispositivo_real(dispositivo_id: int) -> ResultadoDispositivo:
    async with _semaforo:
        try:
            json_bruto = await fetch_api(route="telemetria", params={"dispositivoId": dispositivo_id})
        except Exception as e:
            return ResultadoDispositivo(dispositivo_id, f"Dispositivo {dispositivo_id}", "?", "ERRO", str(e))

    contexto = await obter_contexto_dispositivo(dispositivo_id)
    # No modo real NÃO geramos o diagnóstico da LLM aqui — é só pra achar o
    # ID certo rápido. O diagnóstico completo você já vê no seu front-end,
    # que chama a rota /pipeline-completo de verdade (com chamado incluso).
    return await _classificar_e_diagnosticar(
        dispositivo_id, contexto["dispositivoNm"], contexto["lojaNm"], json_bruto, gerar_diagnostico_llm=False
    )


def _imprimir_relatorio_real(resultados: List[ResultadoDispositivo]) -> None:
    reais = [r for r in resultados if r.status == "ANOMALIA_REAL"]
    sensores = [r for r in resultados if r.status == "PERDA_DE_SENSOR"]
    normais = [r for r in resultados if r.status == "NORMAL"]
    erros = [r for r in resultados if r.status in ("ERRO", "SEM_DADOS")]

    print("=" * 90)
    print(f"ANOMALIAS REAIS — use estes pro demo ({len(reais)} encontrado(s))")
    print("=" * 90)
    if not reais:
        print("  Nenhuma agora. Tente de novo em alguns minutos, ou use o modo 2 (dados mockados).")
    for r in sorted(reais, key=lambda x: x.eta_minutos if x.eta_minutos is not None else float("inf")):
        print(
            f"  ID {r.dispositivo_id:>6}  |  {r.nome:<28}  |  {r.loja:<20}  |  "
            f"ETA: {_formatar_eta(r.eta_minutos):>9}  |  Alarme: {r.codigo_alarme or '-'}"
        )
        print(f"             {r.detalhe}")

    print()
    print(f"Perda de sensor — NÃO usar pro demo de falha mecânica ({len(sensores)} encontrado(s))")
    for r in sensores:
        print(f"  ID {r.dispositivo_id:>6}  |  {r.nome:<28}  |  {r.detalhe}")

    print()
    print(f"Normais: {len(normais)}   |   Sem dados / erro: {len(erros)}")

    if reais:
        melhor = min(reais, key=lambda x: x.eta_minutos if x.eta_minutos is not None else float("inf"))
        print()
        print(f">>> Recomendado pro demo: ID {melhor.dispositivo_id} — {melhor.nome} ({melhor.loja}) <<<")


async def modo_dados_reais() -> None:
    print("\nBuscando lista de dispositivos (rota /alarmes)...")
    ids = await _listar_dispositivos_ids()
    print(f"{len(ids)} dispositivo(s) encontrado(s). Analisando telemetria de cada um...\n")

    resultados = await asyncio.gather(*(_analisar_dispositivo_real(did) for did in ids))
    _imprimir_relatorio_real(resultados)


# ----------------------------------------------------------------------------
# MODO 2 — dados mockados, passando pela MESMA pipeline (sem abrir chamado)
# ----------------------------------------------------------------------------
async def modo_dados_mockados() -> None:
    print("\nUsando o cenário mockado definido no topo do arquivo (MOCK_TELEMETRIA)...")
    print("Rodando a mesma pipeline (Isolation Forest -> RAG -> LLM)... pode levar alguns segundos.\n")

    resultado = await _classificar_e_diagnosticar(
        MOCK_DISPOSITIVO_ID,
        MOCK_CONTEXTO["dispositivoNm"],
        MOCK_CONTEXTO["lojaNm"],
        MOCK_TELEMETRIA,
        gerar_diagnostico_llm=True,
    )

    print("=" * 90)
    print(f"RESULTADO DO MOCK — {resultado.status}")
    print("=" * 90)
    print(f"Dispositivo : {resultado.nome} ({resultado.loja})")
    print(f"Alarme RAG  : {resultado.codigo_alarme or '-'}")
    print(f"ETA falha   : {_formatar_eta(resultado.eta_minutos)}")
    print(f"Detalhe     : {resultado.detalhe}")

    if resultado.status != "ANOMALIA_REAL":
        print(
            "\nO cenário mockado não gerou uma anomalia real com a base RAG atual — "
            "confira se MOCK_CONTEXTO['dispositivoNm'] casa com uma tag do seu "
            "manuais_tecnicos_rag.json, ou ajuste os valores em MOCK_TELEMETRIA."
        )
    elif resultado.diagnostico_ia:
        print("\n--- Diagnóstico da IA (igual ao que apareceria no front-end) ---")
        print(resultado.diagnostico_ia)

    print("\n(Nenhum chamado real foi aberto — esse modo é só simulação.)")


# ----------------------------------------------------------------------------
# Menu
# ----------------------------------------------------------------------------
async def main() -> None:
    print("Escolha o modo:")
    print("  [1] Buscar dispositivos REAIS na API da Eletrofrio")
    print("  [2] Usar dados MOCKADOS (simulação, sem precisar de equipamento quebrado de verdade)")
    escolha = input("Digite 1 ou 2: ").strip()

    if escolha == "1":
        await modo_dados_reais()
    elif escolha == "2":
        await modo_dados_mockados()
    else:
        print("Opção inválida. Rode de novo e digite 1 ou 2.")


if __name__ == "__main__":
    asyncio.run(main())