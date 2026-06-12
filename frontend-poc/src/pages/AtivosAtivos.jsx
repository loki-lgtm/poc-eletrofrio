import React from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi } from '../components/ui';
import { AtivosTable, ativosKpis } from '../components/AtivosTable';
import * as D from '../utils/mockData';

export function AtivosAtivos() {
  const items = D.ativosAtivos;
  const k = ativosKpis(items);

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Gestão', 'Empresas / Ativos', 'Ativos ativos']}>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Atualizar</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Ativos ativos" sub={`${items.length} equipamentos em operação`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="check" label="Operando normalmente" value={k.normais} accent="--green" />
          <Kpi icon="gauge" label="Em atenção" value={k.atencao} accent="--amber" />
          <Kpi icon="alert" label="Estado crítico" value={k.criticos} accent="--red" />
        </div>

        <div style={{ marginTop: 16 }}>
          <AtivosTable items={items} />
        </div>
      </div></div>
    </>
  );
}
