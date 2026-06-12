import React from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill } from '../components/ui';
import * as D from '../utils/mockData';

export function ConexaoApi() {
  const erros = D.apiLogs.filter((l) => l.status >= 400).length;

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Conexão API']}>
        <div className="field"><Icon name="link" />http://localhost:8000</div>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Testar</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Conexão API" sub="Backend FastAPI · backend-poc" />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="server" label="Endpoints" value={D.apiEndpoints.length} />
          <Kpi icon="check" label="Chamadas (24h)" value={D.apiLogs.length * 45} />
          <Kpi icon="alert" label="Erros (24h)" value={erros} accent={erros > 0 ? '--red' : '--green'} />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Endpoints</h3></div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
            {D.apiEndpoints.map((ep, i) => (
              <div className="row" key={ep.path} style={{ justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < D.apiEndpoints.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className={'method ' + ep.method}>{ep.method.toUpperCase()}</span>
                  <span className="mono" style={{ fontSize: 13 }}>{ep.path}</span>
                </div>
                <div className="row" style={{ gap: 14 }}>
                  <span className="faint" style={{ fontSize: 12.5 }}>{ep.desc}</span>
                  <span className="num faint" style={{ fontSize: 12 }}>{ep.latencia}</span>
                  <Pill kind={ep.status === 'green' ? 'green' : 'red'} dot>{ep.status === 'green' ? 'Operacional' : 'Falha'}</Pill>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Logs recentes</h3></div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th className="c">Método</th><th>Rota</th><th className="c">Status</th><th className="r">Hora</th><th className="r">Duração</th>
              </tr></thead>
              <tbody>
                {D.apiLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="c"><span className={'method ' + l.method}>{l.method.toUpperCase()}</span></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{l.path}</td>
                    <td className="c"><Pill kind={l.status < 400 ? 'green' : 'red'}>{l.status}</Pill></td>
                    <td className="r num faint">{l.hora}</td>
                    <td className="r num">{l.duracao}</td>
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
