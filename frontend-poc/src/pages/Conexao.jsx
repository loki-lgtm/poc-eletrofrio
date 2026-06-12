import React from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill } from '../components/ui';
import * as D from '../utils/mockData';

export function Conexao() {
  const online = D.integracoes.filter((i) => i.status === 'green').length;
  const pendentes = D.integracoes.filter((i) => i.status !== 'green').length;

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Conexão']}>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Testar conexões</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Conexão" sub={`${D.integracoes.length} integrações configuradas`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="link" label="Integrações" value={D.integracoes.length} />
          <Kpi icon="check" label="Online" value={online} accent="--green" />
          <Kpi icon="alert" label="Pendentes" value={pendentes} accent="--amber" />
        </div>

        <div className="two-col" style={{ marginTop: 16 }}>
          {D.integracoes.map((it) => (
            <div className="card" key={it.nome}>
              <div className="card-h">
                <span className="ic" style={{
                  width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center',
                  background: it.status === 'green' ? 'var(--green-soft)' : 'var(--amber-soft)',
                  color: it.status === 'green' ? 'var(--green)' : 'var(--amber)',
                }}><Icon name={it.icon} size={15} /></span>
                <h3>{it.nome}</h3>
                <Pill kind={it.status === 'green' ? 'green' : 'amber'} dot>{it.status === 'green' ? 'Conectado' : 'Atenção'}</Pill>
              </div>
              <div className="card-b">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="faint" style={{ fontSize: 12 }}>Tipo</span>
                  <span className="keyval">{it.tipo}</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                  <span className="faint" style={{ fontSize: 12 }}>Detalhe</span>
                  <span className="num" style={{ fontSize: 12.5 }}>{it.detalhe}</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                  <span className="faint" style={{ fontSize: 12 }}>Observação</span>
                  <span className="muted" style={{ fontSize: 12.5 }}>{it.meta}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div></div>
    </>
  );
}
