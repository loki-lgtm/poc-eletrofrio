import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill, TipoPill, PrioPill, Modal } from '../components/ui';
import { AnaliseCardsPanel } from '../components/AnaliseCards';
import * as D from '../utils/mockData';

const actions = [
  { icon: 'alert', tone: 'red', tag: 'Crítico', title: 'Anomalias críticas', n: 4,
    desc: 'equipamentos com score Isolation Forest > 0.85', cta: 'Ver ocorrências' },
  { icon: 'users', tone: 'amber', tag: 'Urgente', title: 'Chamados sem responsável', n: 5,
    desc: 'chamados abertos sem técnico atribuído', cta: 'Atribuir técnicos' },
  { icon: 'wrench', tone: 'purple', tag: 'Atenção', title: 'Manutenções atrasadas', n: 3,
    desc: 'intervenções preventivas com prazo vencido', cta: 'Agendar' },
];

const ESTADO_DOT = { critico: 'red', atencao: 'amber', ok: 'green', sem_dados: 'gray', sem_especificacao: 'gray', erro: 'gray' };
const ESTADO_LABEL = {
  critico: 'Crítico', atencao: 'Atenção', ok: 'Operacional',
  sem_dados: 'Sem telemetria', sem_especificacao: 'Sem spec. RAG', erro: 'Erro',
};
const PRIORIDADE_ESTADO = { critico: 0, atencao: 1, erro: 2, sem_dados: 3, sem_especificacao: 4, ok: 5 };

export function PaginaInicial({ setTelaAtiva, analise, loadingAnalise, dispositivoId }) {
  const [modal, setModal] = useState(null);
  const [semTecnico, setSemTecnico] = useState(() => D.chamados.filter((c) => c.tecnico === '—').slice(0, 5));
  const [atrasadas, setAtrasadas] = useState(() => D.manutencoes.filter((m) => m.atraso));
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaEmpresa, setNovaEmpresa] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState(D.prioridades[0]);
  const [totalDispositivos, setTotalDispositivos] = useState(null);
  const [monitoramento, setMonitoramento] = useState(null);
  const [carregandoMonitor, setCarregandoMonitor] = useState(true);
  const [erroMonitor, setErroMonitor] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/dispositivos')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('falha'))))
      .then((lista) => setTotalDispositivos(lista.length))
      .catch(() => setTotalDispositivos(null));
  }, []);

  const buscarMonitoramento = () => {
    setCarregandoMonitor(true);
    setErroMonitor(null);
    fetch('http://localhost:8000/monitoramento/status')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Falha ao consultar /monitoramento/status.'))))
      .then(setMonitoramento)
      .catch((e) => setErroMonitor(e.message))
      .finally(() => setCarregandoMonitor(false));
  };

  useEffect(() => { buscarMonitoramento(); }, []);

  const dispositivosOrdenados = (monitoramento?.dispositivos || [])
    .slice()
    .sort((a, b) => (PRIORIDADE_ESTADO[a.estado] ?? 9) - (PRIORIDADE_ESTADO[b.estado] ?? 9))
    .slice(0, 6);

  const atribuir = (chamadoId, tecnico) => {
    setSemTecnico((prev) => prev.map((c) => (c.id === chamadoId ? { ...c, tecnico } : c)));
  };
  const confirmarAgendamento = (manutencaoId) => {
    setAtrasadas((prev) => prev.filter((m) => m.id !== manutencaoId));
  };
  const criarChamado = () => {
    if (!novoTitulo.trim()) return;
    setSemTecnico((prev) => [
      { id: 'CH-' + Math.floor(Math.random() * 9000 + 1000), titulo: novoTitulo, emp: novaEmpresa || 'Não informado', eq: '—', tecnico: '—' },
      ...prev,
    ]);
    setNovoTitulo('');
    setNovaEmpresa('');
    setModal(null);
  };

  const actionHandlers = [
    () => setTelaAtiva && setTelaAtiva('ocorrencias'),
    () => setModal('tecnicos'),
    () => setModal('manutencao'),
  ];

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Visão geral']}>
        <div className="field"><Icon name="calendar" />Últimas 24h</div>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Atualizar</button>
        <button className="btn primary" onClick={() => setModal('novo')}><Icon name="plus" />Novo chamado</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Visão geral do sistema"
          sub="Estado operacional em tempo real · 5 unidades · atualizado há 12 segundos">
          <div className="row">
            <span className="pill green" style={{ height: 26 }}><span className="statusdot green pulse" />Online</span>
          </div>
        </PageHead>

        {/* KPIs */}
        <div className="kpis">
          <Kpi icon="cpu" label="Equipamentos monitorados" value={totalDispositivos ?? '—'}
            sub={<span className="faint">{totalDispositivos == null ? 'carregando via API Galileo…' : 'via GET /dispositivos (API Galileo)'}</span>} />
          <Kpi icon="file" label="Chamados ativos" value="27" accent="--amber"
            sub={<span className="delta up"><Icon name="arrowUp" size={12} />+12 esta semana</span>}
            foot={[{ value: '5', label: 'Críticos', color: 'var(--red)' },
              { value: '11', label: 'Andamento', color: 'var(--amber)' },
              { value: '3', label: 'Aprovação', color: 'var(--purple)' }]} />
          <Kpi icon="sparkles" label="Anomalias detectadas (IA)" value="19" accent="--red"
            sub={<span className="faint">Isolation Forest · LightGBM · RAG</span>}
            foot={[{ value: '12', label: 'Falhas reais', color: 'var(--red)' },
              { value: '7', label: 'Falsos pos.', color: 'var(--text-dim)' },
              { value: '4', label: 'Score alto', color: 'var(--amber)' }]} />
          <Kpi icon="users" label="Utilizadores do sistema" value="34" accent="--cyan"
            sub={<span className="delta flat">estável</span>}
            foot={[{ value: '18', label: 'Técnicos' },
              { value: '10', label: 'Superv.' },
              { value: '6', label: 'Admins' }]} />
        </div>

        {/* diagnóstico do dispositivo monitorado — mesmos cards configuráveis da Telemetria ao Vivo */}
        <div className="row" style={{ justifyContent: 'space-between', margin: '4px 0 12px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Diagnóstico do dispositivo monitorado</h2>
          <span className="faint" style={{ fontSize: 12.5 }}>dispositivo {dispositivoId} · <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTelaAtiva?.('telemetria')}>ver telemetria completa</span></span>
        </div>
        <AnaliseCardsPanel analise={analise} loading={loadingAnalise} critica={!!analise?.tem_anomalia_critica} />

        {/* priority actions */}
        <div className="row" style={{ justifyContent: 'space-between', margin: '4px 0 12px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Ações prioritárias</h2>
          <span className="faint" style={{ fontSize: 12.5 }}>3 itens requerem atenção</span>
        </div>
        <div className="three-col" style={{ marginBottom: 22 }}>
          {actions.map((a, i) => (
            <div className="card" key={i} style={{ padding: '16px 17px' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="ic" style={{
                  width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center',
                  background: `var(--${a.tone}-soft)`, color: `var(--${a.tone})`,
                }}><Icon name={a.icon} size={17} /></span>
                <Pill kind={a.tone}>{a.tag}</Pill>
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, margin: '13px 0 2px' }}>
                <span className="mono" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', color: `var(--${a.tone})` }}>
                  {i === 1 ? semTecnico.length : i === 2 ? atrasadas.length : a.n}
                </span>
                <b style={{ fontSize: 14 }}>{a.title}</b>
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 15px' }}>{a.desc}</p>
              <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={actionHandlers[i]}>{a.cta}<Icon name="chevR" size={14} /></button>
            </div>
          ))}
        </div>

        {/* alerts + systems */}
        <div className="two-col">
          <div className="card">
            <div className="card-h">
              <h3>Alertas recentes</h3>
              <span className="sub">tempo real</span>
              <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setTelaAtiva && setTelaAtiva('ocorrencias')}>Ver todos<Icon name="chevR" size={14} /></button>
            </div>
            <div className="card-b flush">
              <table className="tbl">
                <thead><tr>
                  <th>Empresa</th><th>Equipamento</th><th>Classificação IA</th><th className="c">Prioridade</th><th className="r">Score</th><th className="r">Hora</th>
                </tr></thead>
                <tbody>
                  {D.alerts.slice(0, 7).map((a) => (
                    <tr key={a.id}>
                      <td className="cellmain">{a.emp}</td>
                      <td className="muted">{a.eq}</td>
                      <td><TipoPill v={a.tipo} /></td>
                      <td className="c"><PrioPill v={a.prioridade} /></td>
                      <td className="r num" style={{ color: a.score > 0.8 ? 'var(--red)' : a.score > 0.6 ? 'var(--amber)' : 'var(--text-dim)' }}>{a.score}</td>
                      <td className="r num faint">{a.hora}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-h"><h3>Monitoramento preditivo</h3>
                <span className="sub">ETA por dispositivo · sob-demanda</span>
                <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={buscarMonitoramento} disabled={carregandoMonitor}>
                  <Icon name="refresh" size={13} />{carregandoMonitor ? 'Avaliando…' : 'Atualizar'}
                </button>
              </div>
              {monitoramento && !carregandoMonitor && (
                <div className="row" style={{ gap: 8, padding: '10px 16px 0' }}>
                  <span className="pill red"><span className="dot" />{monitoramento.resumo.critico} crítico</span>
                  <span className="pill amber"><span className="dot" />{monitoramento.resumo.atencao} atenção</span>
                  <span className="pill green"><span className="dot" />{monitoramento.resumo.ok} ok</span>
                  <span className="faint" style={{ fontSize: 11.5, marginLeft: 'auto' }}>{monitoramento.total} dispositivos</span>
                </div>
              )}
              <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
                {carregandoMonitor && (
                  <span className="faint" style={{ fontStyle: 'italic', padding: '9px 16px' }}>Avaliando ETA de cada dispositivo via API Galileo…</span>
                )}
                {erroMonitor && !carregandoMonitor && (
                  <span style={{ color: 'var(--red)', fontSize: 12.5, padding: '9px 16px' }}><Icon name="alert" size={13} /> {erroMonitor}</span>
                )}
                {!carregandoMonitor && !erroMonitor && dispositivosOrdenados.map((s, i) => (
                  <div className="row" key={s.dispositivo_id} style={{ justifyContent: 'space-between', padding: '9px 16px', borderBottom: i < dispositivosOrdenados.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
                      <span className={'statusdot ' + ESTADO_DOT[s.estado]} />
                      <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</span>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end', lineHeight: 1.2, flexShrink: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: `var(--${ESTADO_DOT[s.estado] === 'gray' ? 'text-dim' : ESTADO_DOT[s.estado]})` }}>{ESTADO_LABEL[s.estado]}</span>
                      <span className="faint mono" style={{ fontSize: 10.5 }}>{s.eta_minutos != null ? `ETA ${s.eta_minutos} min` : s.loja || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Eficiência energética</h3><span className="sub">OPEX · 24h</span></div>
              <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[{ l: 'Fora do set point', v: '6', u: 'equip.', c: '--amber' },
                  { l: 'Impacto estimado', v: '+14', u: '%', c: '--red' },
                  { l: 'Time to Failure', v: '31', u: 'h', c: '--cyan' },
                  { l: 'Ativos eficientes', v: '89', u: '%', c: '--green' }].map((m, i) => (
                  <div key={i}>
                    <div className="faint" style={{ fontSize: 11.5, marginBottom: 4 }}>{m.l}</div>
                    <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: `var(${m.c})` }}>{m.v}<span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 3 }}>{m.u}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div></div>

      <Modal open={modal === 'novo'} onClose={() => setModal(null)} title="Novo chamado" sub="Abertura manual de chamado"
        footer={<>
          <button className="btn ghost sm" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn primary sm" disabled={!novoTitulo.trim()} onClick={criarChamado}>Criar chamado</button>
        </>}>
        <div className="form-row"><label className="lbl">Título<span>Descreva o problema observado</span></label>
          <input className="inp" placeholder="Ex: Temperatura fora do set point" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} /></div>
        <div className="form-row"><label className="lbl">Empresa</label>
          <select className="inp" value={novaEmpresa} onChange={(e) => setNovaEmpresa(e.target.value)}>
            <option value="">Selecione...</option>{D.sites.map((s) => <option key={s.id}>{s.name}</option>)}
          </select></div>
        <div className="form-row"><label className="lbl">Prioridade</label>
          <select className="inp" value={novaPrioridade} onChange={(e) => setNovaPrioridade(e.target.value)}>
            {D.prioridades.map((p) => <option key={p}>{p}</option>)}
          </select></div>
      </Modal>

      <Modal open={modal === 'tecnicos'} onClose={() => setModal(null)} title="Chamados sem responsável" sub={`${semTecnico.length} chamados aguardando atribuição`} width={560}
        footer={<button className="btn primary sm" onClick={() => setModal(null)}>Concluir</button>}>
        <div className="col" style={{ gap: 10 }}>
          {semTecnico.map((c) => (
            <div className="row" key={c.id} style={{ justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="col">
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.id} · {c.titulo}</span>
                <span className="faint" style={{ fontSize: 11.5 }}>{c.emp} · {c.eq}</span>
              </div>
              <select className="inp" style={{ width: 160 }} value={c.tecnico} onChange={(e) => atribuir(c.id, e.target.value)}>
                {D.tecnicos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
          {semTecnico.length === 0 && <p className="muted">Todos os chamados já possuem técnico atribuído.</p>}
        </div>
      </Modal>

      <Modal open={modal === 'manutencao'} onClose={() => setModal(null)} title="Manutenções atrasadas" sub={`${atrasadas.length} intervenções com prazo vencido`} width={560}
        footer={<button className="btn primary sm" onClick={() => setModal(null)}>Concluir</button>}>
        <div className="col" style={{ gap: 10 }}>
          {atrasadas.map((m) => (
            <div className="row" key={m.id} style={{ justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="col">
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.id} · {m.ativo}</span>
                <span className="faint" style={{ fontSize: 11.5 }}>{m.empresa} · {m.tipo} · técnico {m.tecnico}</span>
              </div>
              <button className="btn sm" onClick={() => confirmarAgendamento(m.id)}><Icon name="calendar" size={13} />Agendar</button>
            </div>
          ))}
          {atrasadas.length === 0 && <p className="muted">Nenhuma manutenção atrasada pendente.</p>}
        </div>
      </Modal>
    </>
  );
}
