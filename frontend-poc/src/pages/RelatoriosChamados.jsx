import React, { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, PrioPill, EstadoPill, Modal, Switch } from '../components/ui';
import { Donut, Histogram, HBars } from '../components/charts';
import * as D from '../utils/mockData';

const dist = [
  { label: 'Resolvido', value: 142, color: 'var(--green)' },
  { label: 'Em andamento', value: 38, color: 'var(--amber)' },
  { label: 'Aberto', value: 27, color: 'var(--accent)' },
  { label: 'Aprovação', value: 14, color: 'var(--purple)' },
  { label: 'Fechado', value: 61, color: 'var(--text-faint)' },
];
const total = dist.reduce((s, x) => s + x.value, 0);

const kpis = [
  { ic: 'inbox', l: 'Total no período', v: '282', d: '+9.4%', up: true, good: false },
  { ic: 'check', l: 'SLA cumprido', v: '91.2', u: '%', d: '+2.1pp', up: true, good: true },
  { ic: 'clock', l: 'MTTR médio', v: '4.8', u: 'h', d: '−18min', up: false, good: true },
  { ic: 'file', l: 'Backlog aberto', v: '27', d: '+12', up: true, good: false },
  { ic: 'refresh', l: 'Reabertos', v: '6', d: '−2', up: false, good: true },
];

export function RelatoriosChamados() {
  const [sort, setSort] = useState({ k: 'sla', dir: 'desc' });
  const [filtros, setFiltros] = useState({ prioridade: '', estado: '' });
  const [modal, setModal] = useState(null);
  const [colunas, setColunas] = useState({ tecnico: true, sla: true, dias: true, origem: true });

  const rows = useMemo(() => {
    let r = [...D.chamados];
    if (filtros.prioridade) r = r.filter((c) => c.prioridade === filtros.prioridade);
    if (filtros.estado) r = r.filter((c) => c.estado === filtros.estado);
    const { k, dir } = sort;
    r.sort((a, b) => {
      let va = a[k], vb = b[k];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return (va < vb ? -1 : va > vb ? 1 : 0) * (dir === 'asc' ? 1 : -1);
    });
    return r;
  }, [sort, filtros]);

  const filtrosAtivos = (filtros.prioridade ? 1 : 0) + (filtros.estado ? 1 : 0);

  const exportarCSV = () => {
    const headers = ['Chamado', 'Assunto', 'Empresa', 'Prioridade', 'Estado', 'Técnico', 'SLA', 'Aberto há', 'Origem'];
    const linhas = rows.map((c) => [c.id, c.titulo, c.emp, c.prioridade, c.estado, c.tecnico, c.sla + '%', c.dias + 'd', c.origem]);
    const csv = [headers, ...linhas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-chamados.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const th = (k, label, cls) => (
    <th className={(cls || '') + ' sortable'} onClick={() => setSort((s) => ({ k, dir: s.k === k && s.dir === 'desc' ? 'asc' : 'desc' }))}>
      {label}{sort.k === k && <span style={{ marginLeft: 4, opacity: .7 }}>{sort.dir === 'desc' ? '↓' : '↑'}</span>}
    </th>
  );

  const slaCell = (v) => {
    const color = v > 100 ? 'var(--red)' : v > 80 ? 'var(--amber)' : 'var(--green)';
    return (
      <div className="row" style={{ gap: 9, justifyContent: 'flex-end' }}>
        <div className="meter" style={{ width: 64 }}><i style={{ width: Math.min(100, v) + '%', background: color }} /></div>
        <span className="num" style={{ width: 52, textAlign: 'right', color, fontSize: 12.5 }}>{v > 100 ? 'Vencido' : v + '%'}</span>
      </div>
    );
  };

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Chamados', 'Relatório de Chamados']}>
        <div className="field"><Icon name="calendar" />01 – 11 Jun 2026</div>
        <button className="btn" onClick={() => setModal('filtros')}><Icon name="filter" />Filtros{filtrosAtivos > 0 && <span className="tag" style={{ marginLeft: 2 }}>{filtrosAtivos}</span>}</button>
        <button className="btn" onClick={exportarCSV}><Icon name="download" />CSV</button>
        <button className="btn primary" onClick={() => setModal('pdf')}><Icon name="file" />Exportar PDF</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Relatório de Chamados"
          sub="Período 01–11 Jun 2026 · comparado com período anterior · 5 unidades">
          <div className="seg">
            <button>Semana</button><button className="on">Mês</button><button>Trimestre</button>
          </div>
        </PageHead>

        {/* KPI strip with deltas */}
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
          {kpis.map((m, i) => (
            <div className="kpi" key={i} style={{ padding: '14px 15px' }}>
              <div className="kpi-top"><span className="ic"><Icon name={m.ic} size={14} /></span>{m.l}</div>
              <div className="kpi-val" style={{ fontSize: 26, margin: '11px 0 6px' }}>{m.v}{m.u && <span style={{ fontSize: 14, color: 'var(--text-faint)', marginLeft: 3 }}>{m.u}</span>}</div>
              <div className={'delta ' + (m.good ? 'up' : 'down')}>
                <Icon name={m.up ? 'arrowUp' : 'arrowDown'} size={12} />{m.d}
                <span className="faint" style={{ fontWeight: 500, marginLeft: 3 }}>vs anterior</span>
              </div>
            </div>
          ))}
        </div>

        {/* charts row */}
        <div className="grid" style={{ gridTemplateColumns: '300px minmax(0,1fr) minmax(0,1fr)', margin: '20px 0', alignItems: 'stretch' }}>
          <div className="card">
            <div className="card-h"><h3>Distribuição por estado</h3></div>
            <div className="card-b" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Donut segments={dist} size={132} thickness={17} center={{ value: total, label: 'chamados' }} />
              <div className="col" style={{ gap: 8, flex: 1 }}>
                {dist.map((d, i) => (
                  <div className="row" key={i} style={{ justifyContent: 'space-between' }}>
                    <span className="row" style={{ gap: 7, fontSize: 12.5 }}><span className="dot" style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />{d.label}</span>
                    <span className="num faint" style={{ fontSize: 12 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Novos vs. resolvidos</h3><span className="sub">por dia</span>
              <div className="legend" style={{ marginLeft: 'auto' }}>
                <span><span className="dot" style={{ background: 'var(--accent)' }} />Novos</span>
                <span><span className="dot" style={{ background: 'var(--green)' }} />Resolvidos</span>
              </div>
            </div>
            <div className="card-b">
              <Histogram a={D.bars(51, 22, 6, 8)} b={D.bars(52, 22, 5, 7)}
                height={158} colorA="var(--accent)" colorB="var(--green)"
                xLabels={['1 Jun', '4', '7', '11']} />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Por empresa</h3><span className="sub">volume no período</span></div>
            <div className="card-b">
              <HBars items={[
                { label: 'Mercado Central', value: 71, color: 'var(--accent)' },
                { label: 'BomPreço', value: 63, color: 'var(--accent)' },
                { label: 'Rede FrioBom', value: 52, color: 'var(--accent)' },
                { label: 'SuperFrio', value: 51, color: 'var(--accent)' },
                { label: 'Atacadão Norte', value: 45, color: 'var(--accent)' },
              ]} max={75} />
              <div className="divider" style={{ margin: '14px 0 12px' }} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="faint" style={{ fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tempo médio 1ª resposta</span>
                <span className="num" style={{ fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>27 min</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <span className="faint" style={{ fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Originados por IA</span>
                <span className="num" style={{ fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', flexShrink: 0 }}>58%</span>
              </div>
            </div>
          </div>
        </div>

        {/* detailed table */}
        <div className="card">
          <div className="card-h">
            <h3>Detalhe de chamados</h3>
            <span className="sub">{rows.length} registos</span>
            <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
              <div className="field sm" style={{ height: 30 }}><Icon name="search" size={14} /><input placeholder="Procurar…" style={{ width: 150 }} /></div>
              <button className="btn sm" onClick={() => setModal('colunas')}><Icon name="sliders" size={14} />Colunas</button>
            </div>
          </div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                {th('id', 'Chamado')}
                {th('titulo', 'Assunto')}
                {th('emp', 'Empresa')}
                {th('prioridade', 'Prioridade', 'c')}
                {th('estado', 'Estado')}
                {colunas.tecnico && th('tecnico', 'Técnico')}
                {colunas.sla && th('sla', 'SLA', 'r')}
                {colunas.dias && th('dias', 'Aberto há', 'r')}
                {colunas.origem && <th className="c">Origem</th>}
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="num" style={{ color: 'var(--text-dim)' }}>{c.id}</td>
                    <td><div className="cellmain">{c.titulo}</div><div className="cellsub">{c.eq}</div></td>
                    <td className="muted">{c.emp}</td>
                    <td className="c"><PrioPill v={c.prioridade} /></td>
                    <td><EstadoPill v={c.estado} /></td>
                    {colunas.tecnico && <td className="muted">{c.tecnico}</td>}
                    {colunas.sla && <td className="r">{slaCell(c.sla)}</td>}
                    {colunas.dias && <td className="r num faint">{c.dias}d</td>}
                    {colunas.origem && <td className="c">{c.origem === 'IA'
                      ? <span className="pill blue"><Icon name="sparkles" size={11} />IA</span>
                      : <span className="tag">Manual</span>}</td>}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nenhum chamado corresponde aos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>

      <Modal open={modal === 'filtros'} onClose={() => setModal(null)} title="Filtros" sub="Detalhe de chamados"
        footer={<>
          <button className="btn ghost sm" onClick={() => { setFiltros({ prioridade: '', estado: '' }); }}>Limpar</button>
          <button className="btn primary sm" onClick={() => setModal(null)}>Aplicar</button>
        </>}>
        <div className="form-row"><label className="lbl">Prioridade</label>
          <select className="inp" value={filtros.prioridade} onChange={(e) => setFiltros((f) => ({ ...f, prioridade: e.target.value }))}>
            <option value="">Todas</option>
            {D.prioridades.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-row"><label className="lbl">Estado</label>
          <select className="inp" value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
            <option value="">Todos</option>
            {D.estados.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </Modal>

      <Modal open={modal === 'pdf'} onClose={() => setModal(null)} title="Exportar PDF" sub={`${rows.length} chamados no relatório`}
        footer={<>
          <button className="btn ghost sm" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn primary sm" onClick={() => setModal(null)}><Icon name="file" size={13} />Gerar PDF</button>
        </>}>
        <p className="muted" style={{ fontSize: 12.5 }}>O relatório será gerado com os filtros e colunas atualmente aplicados e enviado para download.</p>
      </Modal>

      <Modal open={modal === 'colunas'} onClose={() => setModal(null)} title="Colunas visíveis" sub="Detalhe de chamados"
        footer={<button className="btn primary sm" onClick={() => setModal(null)}>Concluir</button>}>
        <div className="col" style={{ gap: 10 }}>
          {[['tecnico', 'Técnico'], ['sla', 'SLA'], ['dias', 'Aberto há'], ['origem', 'Origem']].map(([k, label]) => (
            <div className="row" key={k} style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <Switch on={colunas[k]} onClick={() => setColunas((c) => ({ ...c, [k]: !c[k] }))} />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
