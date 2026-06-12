import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Modal } from '../components/ui';
import { Donut, Histogram, HBars, VBars } from '../components/charts';
import { useFilters } from '../context/FiltersContext';
import * as D from '../utils/mockData';

export function Analise() {
  const { range } = useFilters();
  const [exportar, setExportar] = useState(false);

  const porGrupo = D.gruposComContagem.map((g, i) => ({
    label: g.nome, value: g.total,
    color: ['var(--accent)', 'var(--cyan)', 'var(--purple)', 'var(--amber)', 'var(--green)'][i % 5],
  }));
  const total = porGrupo.reduce((s, x) => s + x.value, 0);

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Análise']}>
        <div className="field"><Icon name="calendar" />{range}</div>
        <button className="btn" onClick={() => setExportar(true)}><Icon name="download" />Exportar</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Análise" sub={`Indicadores agregados · janela ${range}`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          <Kpi icon="cpu" label="Ativos monitorados" value={D.ativos.length} />
          <Kpi icon="sparkles" label="Ocorrências (IA)" value={D.ocorrencias.length} accent="--red" />
          <Kpi icon="file" label="Chamados no período" value={D.chamados.length} accent="--amber" />
          <Kpi icon="dollar" label="Impacto de falhas" value={'R$ ' + D.falhas.reduce((s, f) => s + Number(f.impacto.replace(/\D/g, '')), 0).toLocaleString('pt-BR')} accent="--red" />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '300px minmax(0,1fr) minmax(0,1fr)', margin: '20px 0', alignItems: 'stretch' }}>
          <div className="card">
            <div className="card-h"><h3>Ativos por grupo</h3></div>
            <div className="card-b" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Donut segments={porGrupo} size={132} thickness={17} center={{ value: total, label: 'ativos' }} />
              <div className="col" style={{ gap: 8, flex: 1 }}>
                {porGrupo.map((d, i) => (
                  <div className="row" key={i} style={{ justifyContent: 'space-between' }}>
                    <span className="row" style={{ gap: 7, fontSize: 12.5 }}><span className="dot" style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />{d.label}</span>
                    <span className="num faint" style={{ fontSize: 12 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Ocorrências vs. chamados</h3><span className="sub">últimos 22 dias</span>
              <div className="legend" style={{ marginLeft: 'auto' }}>
                <span><span className="dot" style={{ background: 'var(--red)' }} />Ocorrências</span>
                <span><span className="dot" style={{ background: 'var(--accent)' }} />Chamados</span>
              </div>
            </div>
            <div className="card-b">
              <Histogram a={D.bars(61, 22, 5, 6)} b={D.bars(62, 22, 4, 5)} height={158} colorA="var(--red)" colorB="var(--accent)" xLabels={['1 Jun', '8', '15', '22']} />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Top ativos por score IA</h3></div>
            <div className="card-b">
              <HBars items={[...D.ativos].sort((a, b) => b.score - a.score).slice(0, 5).map((a) => ({
                label: a.nome, value: a.score, display: a.score.toFixed(2),
                color: a.saude === 'red' ? 'var(--red)' : a.saude === 'amber' ? 'var(--amber)' : 'var(--accent)',
              }))} max={1} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Anomalias por hora</h3><span className="sub">classificadas pela IA · {range}</span></div>
          <div className="card-b">
            <VBars data={D.bars(909, 24, 0.6, 4).map((v) => Math.round(v))} height={150} color="var(--red)" labels={['0h', '6h', '12h', '18h', '24h']} />
          </div>
        </div>
      </div></div>

      <Modal open={exportar} onClose={() => setExportar(false)} title="Exportar análise" sub={`Janela ${range}`}
        footer={<>
          <button className="btn ghost sm" onClick={() => setExportar(false)}>Cancelar</button>
          <button className="btn primary sm" onClick={() => setExportar(false)}><Icon name="download" size={13} />Exportar</button>
        </>}>
        <div className="form-row"><label className="lbl">Formato</label>
          <select className="inp"><option>CSV</option><option>PDF</option><option>XLSX</option></select></div>
        <div className="form-row"><label className="lbl">Conteúdo</label>
          <select className="inp"><option>Indicadores agregados</option><option>Ativos por grupo</option><option>Ocorrências vs. chamados</option><option>Top ativos por score IA</option></select></div>
      </Modal>
    </>
  );
}
