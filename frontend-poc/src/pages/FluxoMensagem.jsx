import React from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill } from '../components/ui';
import * as D from '../utils/mockData';

export function FluxoMensagem() {
  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Fluxo de Mensagem']}>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Atualizar</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Fluxo de Mensagem" sub="Pipeline ponta a ponta — do sensor à notificação via WhatsApp (API Aumbler)" />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="zap" label="Mensagens processadas (24h)" value="1.2k" />
          <Kpi icon="check" label="Chamados notificados" value={D.ocorrencias.filter((o) => o.status === 'Chamado aberto').length} accent="--green" />
          <Kpi icon="clock" label="Latência média do pipeline" value="2.4" unit="s" accent="--cyan" />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Etapas do pipeline</h3><span className="sub">POST /pipeline-completo/{'{dispositivo_id}'}</span></div>
          <div className="card-b">
            <div className="flow">
              {D.fluxoEtapas.map((etapa, i) => (
                <React.Fragment key={etapa.nome}>
                  <div className="flow-node">
                    <span className="fn-ic"><Icon name={etapa.icon} size={16} /></span>
                    <b>{etapa.nome}</b>
                    <span className="fn-meta">{etapa.meta}</span>
                  </div>
                  {i < D.fluxoEtapas.length - 1 && <div className="flow-arrow"><Icon name="chevR" size={18} /></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Notificações recentes</h3><span className="sub">via WhatsApp · Aumbler</span></div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th>Ativo</th><th>Empresa</th><th>Mensagem</th><th className="c">Canal</th><th className="r">Hora</th><th className="c">Status</th>
              </tr></thead>
              <tbody>
                {D.ocorrencias.filter((o) => o.status === 'Chamado aberto').slice(0, 8).map((o) => (
                  <tr key={o.id}>
                    <td className="cellmain">{o.ativo}</td>
                    <td className="muted">{o.empresa}</td>
                    <td className="muted">Chamado aberto: {o.descricao}</td>
                    <td className="c"><span className="pill green">WhatsApp</span></td>
                    <td className="r num faint">{o.hora}</td>
                    <td className="c"><Pill kind="green" dot>Entregue</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>
    </>
  );
}
