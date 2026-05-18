import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import './style/App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diagnostico, setDiagnostico] = useState('');
  const [carregandoIa, setCarregandoIa] = useState(false);
  const [dispositivoId, setDispositivoId] = useState('30663');

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/telemetria/${dispositivoId}`)
      .then((response) => response.json())
      .then((json) => {
        setData(json.dados);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      });
  }, [dispositivoId]);

  const anomalias = data.filter((ponto) => ponto.is_anomaly);

  const solicitarDiagnosticoRAG = (anomalia) => {
    setCarregandoIa(true);
    fetch('http://localhost:8000/diagnostico-ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperatura: anomalia['Temperatura Ambiente'],
        status_degelo: anomalia['Status Degelo'],
        horario: anomalia.horario,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setDiagnostico(data.diagnostico_rag);
        setCarregandoIa(false);
      })
      .catch((err) => {
        console.error(err);
        setCarregandoIa(false);
      });
  };

  if (loading) return <div className="loading">Sincronizando com Galileo IoT...</div>;

  return (
    <div className="container">
      <header className="header">
        <div className="header-title">
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Eletrofrio OS</h1>
          <span className="badge">Módulo de Prevenção de Falhas</span>
        </div>
        <div className="device-info">
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>ATIVO MONITORADO</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Balcão Frigorífico</h2>
            <select
              value={dispositivoId}
              onChange={(e) => setDispositivoId(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="10101">ID: 10101 (Operação Normal)</option>
              <option value="20202">ID: 20202 (Ciclo de Degelo)</option>
              <option value="30663">ID: 30663 (Anomalia Crítica)</option>
            </select>
          </div>
        </div>
      </header>

      <main className="main-grid">
        {/* Coluna da Esquerda */}
        <section className="card">
          <h3 className="card-title">Série Temporal de Telemetria (Últimas 24h)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="horario" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Legend />
                <Line
                  name="Temp. Ambiente (°C)"
                  type="monotone"
                  dataKey="Temperatura Ambiente"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#38bdf8' }}
                  activeDot={{ r: 6 }}
                />
                {anomalias.map((anomalia, index) => (
                  <ReferenceDot
                    key={index}
                    x={anomalia.horario}
                    y={anomalia['Temperatura Ambiente']}
                    r={8}
                    fill="#ef4444"
                    stroke="#7f1d1d"
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Coluna da Direita */}
        <section className="sidebar">
          <div className="card">
            <h3 className="card-title">Isolation Forest</h3>

            {anomalias.length > 0 ? (
              <div className="alert-box">
                <div className="alert-header">
                  <h4 style={{ margin: 0, color: '#991b1b' }}>Quebra de Padrão Térmico</h4>
                </div>

                {anomalias.map((a, idx) => (
                  <div key={idx} className="alert-item">
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>Hora:</strong> {a.horario} | <strong>Pico:</strong>{' '}
                      {a['Temperatura Ambiente']}°C
                    </p>
                    <button onClick={() => solicitarDiagnosticoRAG(a)} className="action-button">
                      ✧ Acionar Especialista IA (RAG)
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="success-box">
                <p style={{ margin: 0 }}>Operação estável. Modelos alinhados com o setpoint.</p>
              </div>
            )}
          </div>

          {/* Painel de Resposta da IA */}
          {(carregandoIa || diagnostico) && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 className="card-title">Terminal de Diagnóstico RAG</h3>
              {carregandoIa && (
                <div className="loading-pulse">Analisando equipamento e manuais...</div>
              )}
              {diagnostico && !carregandoIa && (
                <div className="ai-response">
                  <span className="ai-badge">LlamaIndex AI</span>
                  <p style={{ margin: '10px 0 0 0', lineHeight: '1.6' }}>{diagnostico}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
