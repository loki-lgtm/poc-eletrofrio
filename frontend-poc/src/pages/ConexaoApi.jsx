import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill } from '../components/ui';
import * as D from '../utils/mockData';

const METHOD_CLASS = { get: 'get', post: 'post', put: 'put', delete: 'del' };

export function ConexaoApi() {
  const [endpoints, setEndpoints] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const erros = D.apiLogs.filter((l) => l.status >= 400).length;

  const carregarEndpoints = () => {
    setCarregando(true);
    setErro(null);
    fetch('http://localhost:8000/openapi.json')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao consultar /openapi.json.');
        return res.json();
      })
      .then((spec) => {
        const lista = [];
        for (const [path, methods] of Object.entries(spec.paths || {})) {
          for (const [method, info] of Object.entries(methods)) {
            lista.push({ method, path, desc: info.summary || info.description || '—' });
          }
        }
        setEndpoints(lista);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarEndpoints(); }, []);

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Conexão API']}>
        <div className="field"><Icon name="link" />http://localhost:8000</div>
        <button className="btn" onClick={carregarEndpoints} disabled={carregando}><Icon name="refresh" />{carregando ? 'Testando…' : 'Testar'}</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Conexão API" sub="Backend FastAPI · backend-poc · rotas lidas em tempo real via /openapi.json" />

        {erro && (
          <div className="card" style={{ borderColor: 'rgba(240,85,107,.3)', marginBottom: 16, padding: '13px 15px' }}>
            <span style={{ color: 'var(--red)', fontSize: 13 }}><Icon name="alert" size={14} /> {erro}</span>
          </div>
        )}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="server" label="Endpoints" value={endpoints.length} />
          <Kpi icon="check" label="Chamadas (24h)" value={D.apiLogs.length * 45} />
          <Kpi icon="alert" label="Erros (24h)" value={erros} accent={erros > 0 ? '--red' : '--green'} />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Endpoints</h3><span className="sub">registrados agora no FastAPI</span></div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
            {endpoints.map((ep, i) => (
              <div className="row" key={ep.method + ep.path} style={{ justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < endpoints.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className={'method ' + (METHOD_CLASS[ep.method] || ep.method)}>{ep.method.toUpperCase()}</span>
                  <span className="mono" style={{ fontSize: 13 }}>{ep.path}</span>
                </div>
                <div className="row" style={{ gap: 14 }}>
                  <span className="faint" style={{ fontSize: 12.5 }}>{ep.desc}</span>
                  <Pill kind="green" dot>Registrado</Pill>
                </div>
              </div>
            ))}
            {carregando && endpoints.length === 0 && <span className="faint" style={{ fontStyle: 'italic', padding: '11px 16px' }}>Consultando /openapi.json…</span>}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Logs recentes</h3><span className="sub">exemplo ilustrativo · sem captura de log real ainda</span></div>
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
