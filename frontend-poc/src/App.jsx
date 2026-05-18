import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './style/App.css'
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/telemetria/30663')
      .then(response => response.json())
      .then(json => {
        setData(json.dados);
        setLoading(false);
      })
      .catch(error => console.error("Erro ao buscar dados:", error));
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando dados do Galileo...</div>;

  // Filtra apenas os pontos que a IA marcou como anomalia para destacar no gráfico
  const anomalias = data.filter(ponto => ponto.is_anomaly);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h2>Painel de Monitoramento Preditivo - Eletrofrio</h2>
      <p>Equipamento: Balcão Frigorífico (ID: 30663)</p>
      
      <div style={{ height: '400px', marginTop: '2rem', border: '1px solid #ccc', padding: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="horario" />
            <YAxis />
            <Tooltip />
            <Legend />
            
            {/* Linha normal da temperatura */}
            <Line 
              type="monotone" 
              dataKey="Temperatura Ambiente" 
              stroke="#0288d1" 
              strokeWidth={2} 
              dot={{ r: 4 }} 
            />
            
            {/* Renderiza pontos vermelhos em cima das coordenadas onde is_anomaly for true */}
            {anomalias.map((anomalia, index) => (
              <ReferenceDot 
                key={index} 
                x={anomalia.horario} 
                y={anomalia["Temperatura Ambiente"]} 
                r={8} 
                fill="red" 
                stroke="none" 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#ffebee', borderLeft: '5px solid red' }}>
        <h3>🚨 Alertas da Inteligência Artificial</h3>
        {anomalias.length > 0 ? (
          <ul>
            {anomalias.map((a, idx) => (
              <li key={idx}>
                <strong>{a.horario}</strong>: Anomalia térmica detectada ({a["Temperatura Ambiente"]}°C).
                Status de Degelo: {a["Status Degelo"] === 1.0 ? "Ativo" : "Inativo"}.
              </li>
            ))}
          </ul>
        ) : (
          <p>Operação normal. Nenhuma anomalia detectada.</p>
        )}
      </div>
    </div>
  );
}

export default App;