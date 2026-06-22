import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill, TipoPill, PrioPill, Modal } from '../components/ui';
import * as D from '../utils/mockData';

const actions = [
  { icon: 'alert', tone: 'red', tag: 'Crítico', title: 'Anomalias críticas', n: 4,
    desc: 'equipamentos com score Isolation Forest > 0.85', cta: 'Ver ocorrências' },
  { icon: 'users', tone: 'amber', tag: 'Urgente', title: 'Chamados sem responsável', n: 5,
    desc: 'chamados abertos sem técnico atribuído', cta: 'Atribuir técnicos' },
  { icon: 'wrench', tone: 'purple', tag: 'Atenção', title: 'Manutenções atrasadas', n: 3,
    desc: 'intervenções preventivas com prazo vencido', cta: 'Agendar' },
];

const systems = [
  { name: 'Sistema Galileo (API)', ok: 'Operacional', state: 'green', meta: '99.98% · 142ms' },
  { name: 'Motor Isolation Forest', ok: 'Operacional', state: 'green', meta: 'lote há 38s' },
  { name: 'Serviço RAG / LlamaIndex', ok: 'Operacional', state: 'green', meta: '7 em fila' },
  { name: 'Pipeline ETL (Python)', ok: 'Atenção', state: 'amber', meta: 'atraso 4min' },
];

export function PaginaInicial({ setTelaAtiva }) {
  const [modal, setModal] = useState(null);
  const [semTecnico, setSemTecnico] = useState(() => D.chamados.filter((c) => c.tecnico === '—').slice(0, 5));
  const [atrasadas, setAtrasadas] = useState(() => D.manutencoes.filter((m) => m.atraso));
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaEmpresa, setNovaEmpresa] = useState('');
  const [novaPrioridade, setNovaPrioridade] = useState(D.prioridades[0]);

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
          <Kpi icon="cpu" label="Equipamentos monitorados" value="142"
            sub={<span className="delta up"><Icon name="arrowUp" size={12} />138 operacionais</span>}
            foot={[{ value: '138', label: 'Ativos', color: 'var(--green)' },
              { value: '4', label: 'Em falha', color: 'var(--red)' },
              { value: '3', label: 'Manut.', color: 'var(--amber)' }]} />
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
              <div className="card-h"><h3>Estado dos sistemas</h3>
                <span className="pill green" style={{ marginLeft: 'auto' }}><span className="dot" />Online</span></div>
              <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
                {systems.map((s, i) => (
                  <div className="row" key={i} style={{ justifyContent: 'space-between', padding: '9px 16px', borderBottom: i < systems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className={'statusdot ' + s.state} />
                      <span style={{ fontSize: 13 }}>{s.name}</span>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end', lineHeight: 1.2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: s.state === 'green' ? 'var(--green)' : 'var(--amber)' }}>{s.ok}</span>
                      <span className="faint mono" style={{ fontSize: 10.5 }}>{s.meta}</span>
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
