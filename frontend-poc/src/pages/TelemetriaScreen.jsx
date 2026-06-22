import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine,
} from 'recharts';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Pill, Modal } from '../components/ui';
import { AnaliseCardsPanel } from '../components/AnaliseCards';
import { Histogram, VBars, Sparkline } from '../components/charts';
import { useFilters, RANGES } from '../context/FiltersContext';
import * as D from '../utils/mockData';
import { useEffect, useState } from 'react';

const statusColor = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' };

export function TelemetriaScreen({
  analise, loading, erro, dispositivoId, setDispositivoId, onReprocessar,
}) {
  const { range, setRange } = useFilters();
  const critica = !!analise?.tem_anomalia_critica;
  const statusCor = critica ? 'var(--red)' : 'var(--green)';

  const [dispositivos, setDispositivos] = useState([]);
  const [telemetria, setTelemetria] = useState(null);
  const [loadingTelemetria, setLoadingTelemetria] = useState(true);
  const [erroTelemetria, setErroTelemetria] = useState(null);
  const [grelha, setGrelha] = useState(false);

  // Lista de equipamentos cadastrados na API Galileo, para o seletor de dispositivo
  useEffect(() => {
    fetch('http://localhost:8000/dispositivos')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao buscar dispositivos.');
        return res.json();
      })
      .then((lista) => {
        setDispositivos(lista);
        // se o dispositivo atual (valor inicial mockado) não existir na lista real, seleciona o primeiro
        if (lista.length > 0 && !lista.some((d) => String(d.id) === String(dispositivoId))) {
          setDispositivoId(String(lista[0].id));
        }
      })
      .catch((error) => console.error('Erro ao buscar dispositivos:', error));
  }, []);

  // Telemetria ao vivo do dispositivo selecionado, vinda da API Galileo
  useEffect(() => {
    if (!dispositivoId) return;
    setLoadingTelemetria(true);
    setErroTelemetria(null);
    fetch(`http://localhost:8000/telemetria/${dispositivoId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao buscar telemetria do dispositivo.');
        return res.json();
      })
      .then(setTelemetria)
      .catch((error) => {
        console.error('Erro ao buscar telemetria:', error);
        setErroTelemetria(error.message);
        setTelemetria(null);
      })
      .finally(() => setLoadingTelemetria(false));
  }, [dispositivoId]);

  const CHART_DATA = telemetria?.data || [];
  const setpoint = telemetria?.setpoint;
  const anomalyPoint = critica
    ? CHART_DATA.find((d) => d.horario === analise?.horario_evento)
    : null;

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Monitoramento', 'Telemetria ao Vivo']}>
        <div className="field">
          <Icon name="cpu" />
          <select
            value={dispositivoId}
            onChange={(e) => setDispositivoId(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            {dispositivos.length === 0 && (
              <option value={dispositivoId}>ID {dispositivoId}</option>
            )}
            {dispositivos.map((d) => (
              <option key={d.id} value={d.id}>ID {d.id} — {d.nome} ({d.loja})</option>
            ))}
          </select>
        </div>
        <div className="seg">
          {Object.keys(RANGES).map((k) => (
            <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{k}</button>
          ))}
        </div>
        <button className="btn" onClick={onReprocessar} disabled={loading}>
          <Icon name="refresh" />{loading ? 'Processando…' : 'Reprocessar'}
        </button>
      </Topbar>
      <div className="scroll"><div className="page page-wide">
        <PageHead title="Telemetria ao Vivo"
          sub={`Ativo monitorado · ${telemetria?.nome_equipamento || 'Equipamento'} · ${telemetria?.loja_nome || ''} · dispositivo ${dispositivoId}`}>
          <div className="row">
            {erro
              ? <span className="pill red"><span className="statusdot red" />Erro na análise</span>
              : <span className={'pill ' + (critica ? 'red' : 'green')} style={{ height: 26 }}>
                  <span className={'statusdot ' + (critica ? 'red pulse' : 'green pulse')} />
                  {loading ? 'Processando…' : (analise?.status_operacao || '—')}
                </span>}
          </div>
        </PageHead>

        {erro && (
          <div className="card" style={{ borderColor: 'rgba(240,85,107,.3)', marginBottom: 16, padding: '13px 15px' }}>
            <span style={{ color: 'var(--red)', fontSize: 13 }}><Icon name="alert" size={14} /> {erro}</span>
          </div>
        )}

        {/* painel de diagnóstico — cards configuráveis (mostrar/ocultar/reordenar) */}
        <AnaliseCardsPanel analise={analise} loading={loading} critica={critica} />

        {/* time series + diagnostic, agora no mesmo card, telemetria com largura total */}
        <div className="card" style={{ marginBottom: 16, borderColor: critica ? 'rgba(240,85,107,.3)' : 'var(--border-2)' }}>
          <div className="card-h">
            <h3>Série temporal — Temperatura</h3>
            <span className="sub">Telemetria ao vivo · dispositivo {dispositivoId}</span>
            <div className="legend" style={{ marginLeft: 'auto' }}>
              <span><i style={{ background: 'var(--accent)' }} />Ambiente</span>
              <span><i style={{ background: 'var(--cyan)' }} />Evaporador</span>
              <span><i style={{ background: 'var(--text-faint)' }} />Setpoint</span>
            </div>
          </div>
          <div className="card-b">
            {erroTelemetria && (
              <span style={{ color: 'var(--red)', fontSize: 13 }}><Icon name="alert" size={14} /> {erroTelemetria}</span>
            )}
            {!erroTelemetria && loadingTelemetria && (
              <span className="faint" style={{ fontStyle: 'italic' }}>Carregando telemetria…</span>
            )}
            {!erroTelemetria && !loadingTelemetria && (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CHART_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="horario" stroke="var(--text-faint)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <YAxis stroke="var(--text-faint)" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)' }}
                      itemStyle={{ color: 'var(--accent)' }}
                    />
                    {setpoint != null && (
                      <ReferenceLine y={setpoint} stroke="var(--text-faint)" strokeDasharray="4 4" strokeWidth={1.2} />
                    )}
                    <Line name="Temp. Ambiente (°C)" type="monotone" dataKey="temp" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
                    <Line name="Temp. Evaporador (°C)" type="monotone" dataKey="evap" stroke="var(--cyan)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    {anomalyPoint && (
                      <ReferenceDot x={anomalyPoint.horario} y={anomalyPoint.temp} r={6} fill="var(--red)" stroke="var(--surface)" strokeWidth={2} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card-h" style={{ borderTop: '1px solid ' + (critica ? 'rgba(240,85,107,.2)' : 'var(--border)') }}>
            <span className="ic" style={{
              width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center',
              background: critica ? 'var(--red-soft)' : 'var(--green-soft)', color: critica ? 'var(--red)' : 'var(--green)',
            }}><Icon name="sparkles" size={15} /></span>
            <h3>Diagnóstico IA</h3>
            <span className={'pill ' + (critica ? 'red' : 'green')} style={{ marginLeft: 'auto' }}>
              {loading ? '…' : (critica ? 'Crítico' : 'Estável')}
            </span>
          </div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading && <span className="faint" style={{ fontStyle: 'italic' }}>Analisando equipamento e manuais…</span>}
            {!loading && analise && (
              <>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: 12 }}>
                  <span className="pill blue" style={{ marginBottom: 8 }}><Icon name="sparkles" size={11} />LlamaIndex AI</span>
                  <p style={{ margin: '10px 0 0', lineHeight: 1.6, fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{analise.diagnostico_ia}</p>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="faint" style={{ fontSize: 12 }}>Chamado técnico</span>
                  {analise.chamado_aberto
                    ? <Pill kind="red" dot>Aberto automaticamente</Pill>
                    : <Pill kind="green" dot>Não necessário</Pill>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* histograms */}
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', marginBottom: 16 }}>
          <div className="card">
            <div className="card-h"><h3>Volume de leituras</h3><span className="sub">req/s por janela</span>
              <span className="num faint" style={{ marginLeft: 'auto', fontSize: 12 }}>361k total · 100/s</span></div>
            <div className="card-b">
              <Histogram a={D.histRequests} b={D.histErrors} height={150}
                colorA="var(--accent)" colorB="var(--red)" xLabels={['00:00', '06:00', '12:00', '18:00', '24:00']} />
              <div className="legend" style={{ marginTop: 6 }}>
                <span><span className="dot" style={{ background: 'var(--accent)' }} />Aceites</span>
                <span><span className="dot" style={{ background: 'var(--red)' }} />Rejeitadas</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Anomalias por hora</h3><span className="sub">classificadas pela IA</span>
              <span className="num faint" style={{ marginLeft: 'auto', fontSize: 12 }}>19 nas últimas 24h</span></div>
            <div className="card-b">
              <VBars data={D.bars(909, 24, 0.6, 4).map((v) => Math.round(v))} height={150}
                color="var(--red)" labels={['0h', '6h', '12h', '18h', '24h']} />
            </div>
          </div>
        </div>

        {/* small multiples */}
        <div className="row" style={{ justifyContent: 'space-between', margin: '4px 0 12px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Equipamentos monitorados</h2>
          <div className="row" style={{ gap: 8 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>138 a reportar</span>
            <button className="btn ghost sm" onClick={() => setGrelha(true)}>Ver grelha completa<Icon name="chevR" size={14} /></button>
          </div>
        </div>
        <div className="sm-grid">
          {D.equipments.map((e, i) => (
            <div className="sm-card" key={i}>
              <div className="sm-top">
                <div className="row" style={{ gap: 7, minWidth: 0 }}>
                  <span className={'statusdot ' + e.status} />
                  <span className="sm-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                </div>
                <span className="pill" style={{ background: 'transparent', border: '1px solid var(--border-2)', color: e.score > 0.7 ? 'var(--red)' : 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{e.score.toFixed(2)}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div className="sm-val" style={{ color: statusColor[e.status] }}>{e.val}<span className="sm-unit"> {e.unit}</span></div>
                  <span className="faint" style={{ fontSize: 11 }}>{e.site}</span>
                </div>
                <Sparkline data={D.series(e.seed, 30, e.base, e.amp * 6)} color={statusColor[e.status]} width={96} height={36} />
              </div>
            </div>
          ))}
        </div>
      </div></div>

      <Modal open={grelha} onClose={() => setGrelha(false)} title="Equipamentos monitorados" sub={`${D.ativos.length} equipamentos`} width={680}
        footer={<button className="btn primary sm" onClick={() => setGrelha(false)}>Fechar</button>}>
        <div className="col" style={{ gap: 0 }}>
          {D.ativos.map((a, i) => (
            <div className="row" key={a.id} style={{ justifyContent: 'space-between', padding: '8px 4px', borderBottom: i < D.ativos.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="row" style={{ gap: 10 }}>
                <span className={'statusdot ' + a.statusDot} />
                <div className="col">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.nome}</span>
                  <span className="faint" style={{ fontSize: 11.5 }}>{a.empresa} · {a.grupo}</span>
                </div>
              </div>
              <span className="num" style={{ fontSize: 12.5, color: a.score > 0.7 ? 'var(--red)' : a.score > 0.45 ? 'var(--amber)' : 'var(--text-dim)' }}>{a.val}{a.unit} · score {a.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
