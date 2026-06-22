import { ChamadosAtivos } from './pages/ChamadosAtivos';
import { RelatoriosChamados } from './pages/RelatoriosChamados';
import { TelemetriaScreen } from './pages/TelemetriaScreen';
import { Ocorrencias } from './pages/Ocorrencias';
import { FalhasOperacionais } from './pages/FalhasOperacionais';
import { OperacaoChamado } from './pages/OperacaoChamado';
import { Empresas } from './pages/Empresas';
import { AtivosAtivos } from './pages/AtivosAtivos';
import { Inativos } from './pages/Inativos';
import { Manutencao } from './pages/Manutencao';
import { Permissoes } from './pages/Permissoes';
import { Conexao } from './pages/Conexao';
import { FluxoMensagem } from './pages/FluxoMensagem';
import { ConexaoApi } from './pages/ConexaoApi';
import { Analise } from './pages/Analise';
import { Configuracao } from './pages/Configuracao';
import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PaginaInicial } from './pages/PaginaInicial';
import { FiltersProvider } from './context/FiltersContext';
import { ThemeProvider } from './context/ThemeContext';
import './style/App.css';

function App() {
  const [telaAtiva, setTelaAtiva] = useState('home');

  const [analise, setAnalise] = useState(null);
  const [loadingAnalise, setLoadingAnalise] = useState(true);
  const [erroAnalise, setErroAnalise] = useState(null);
  const [dispositivoId, setDispositivoId] = useState('30663');

  const executarPipeline = useCallback(() => {
    setLoadingAnalise(true);
    setErroAnalise(null);
    fetch(`http://localhost:8000/pipeline-completo/${dispositivoId}`, {
      method: 'POST',
    })
      .then((response) => {
        if (!response.ok) throw new Error('Falha ao executar pipeline preditivo.');
        return response.json();
      })
      .then((json) => {
        setAnalise(json);
        setLoadingAnalise(false);
      })
      .catch((error) => {
        console.error('Erro ao executar pipeline:', error);
        setErroAnalise(error.message);
        setLoadingAnalise(false);
      });
  }, [dispositivoId]);

  useEffect(() => {
    executarPipeline();
  }, [executarPipeline]);

  return (
    <ThemeProvider>
    <FiltersProvider>
      <div className="app">
        <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} />

        <div className="main">
          {telaAtiva === 'home' && (
            <PaginaInicial
              setTelaAtiva={setTelaAtiva}
              analise={analise}
              loadingAnalise={loadingAnalise}
              dispositivoId={dispositivoId}
            />
          )}

          {telaAtiva === 'relatorios' && <RelatoriosChamados />}

          {telaAtiva === 'chamados_ativos' && <ChamadosAtivos setTelaAtiva={setTelaAtiva} />}
          {telaAtiva === 'operacao_chamado' && <OperacaoChamado setTelaAtiva={setTelaAtiva} />}

          {telaAtiva === 'ocorrencias' && <Ocorrencias />}
          {telaAtiva === 'falhas' && <FalhasOperacionais />}

          {telaAtiva === 'empresas' && <Empresas setTelaAtiva={setTelaAtiva} />}
          {telaAtiva === 'ativos_ativos' && <AtivosAtivos />}
          {telaAtiva === 'inativos' && <Inativos />}
          {telaAtiva === 'manutencao' && <Manutencao />}
          {telaAtiva === 'permissoes' && <Permissoes />}

          {telaAtiva === 'conexao' && <Conexao />}
          {telaAtiva === 'fluxo' && <FluxoMensagem />}
          {telaAtiva === 'api' && <ConexaoApi />}
          {telaAtiva === 'analise' && <Analise />}
          {telaAtiva === 'config' && <Configuracao />}

          {telaAtiva === 'telemetria' && (
            <TelemetriaScreen
              analise={analise}
              loading={loadingAnalise}
              erro={erroAnalise}
              dispositivoId={dispositivoId}
              setDispositivoId={setDispositivoId}
              onReprocessar={executarPipeline}
            />
          )}
        </div>
      </div>
    </FiltersProvider>
    </ThemeProvider>
  );
}

export default App;
