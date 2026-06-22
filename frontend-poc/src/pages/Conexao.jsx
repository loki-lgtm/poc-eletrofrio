import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill } from '../components/ui';

const META = {
  fastapi: { nome: 'FastAPI (backend)', tipo: 'Aplicação', icon: 'server', detalhe: 'Processo local', meta: 'serve as rotas do painel' },
  galileo: { nome: 'API Galileo (Eletrofrio)', tipo: 'REST API', icon: 'link', detalhe: 'credenciamento.eletrofrio.com.br', meta: 'telemetria, dispositivos e abertura de chamado' },
  ollama_llama: { nome: 'Ollama (LLM local)', tipo: 'Modelo de IA', icon: 'sparkles', detalhe: 'localhost · llama3.2', meta: 'gera o diagnóstico técnico' },
  umbler_whatsapp: { nome: 'WhatsApp (Umbler uTalk)', tipo: 'Webhook', icon: 'bell', detalhe: 'app-utalk.umbler.com', meta: 'atendimento e notificações automáticas' },
};

const corStatus = (v) => (v === 'online' || v === 'configurado' ? 'green' : v === 'sem api key' ? 'amber' : 'red');
const labelStatus = (v) => ({ online: 'Conectado', offline: 'Indisponível', configurado: 'Configurado', 'sem api key': 'Sem API key' }[v] || v);

export function Conexao() {
  const [saude, setSaude] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const testarConexoes = () => {
    setCarregando(true);
    setErro(null);
    fetch('http://localhost:8000/saude')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao consultar /saude.');
        return res.json();
      })
      .then(setSaude)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => { testarConexoes(); }, []);

  const servicos = saude ? Object.entries(saude.servicos).map(([k, v]) => ({ key: k, status: v, ...(META[k] || { nome: k, tipo: '—', icon: 'link' }) })) : [];
  const online = servicos.filter((s) => corStatus(s.status) === 'green').length;
  const pendentes = servicos.length - online;

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Conexão']}>
        <button className="btn" onClick={testarConexoes} disabled={carregando}><Icon name="refresh" />{carregando ? 'Testando…' : 'Testar conexões'}</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Conexão" sub={erro ? erro : `${servicos.length} integrações · checagem real via GET /saude`} />

        {erro && (
          <div className="card" style={{ borderColor: 'rgba(240,85,107,.3)', marginBottom: 16, padding: '13px 15px' }}>
            <span style={{ color: 'var(--red)', fontSize: 13 }}><Icon name="alert" size={14} /> {erro}</span>
          </div>
        )}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="link" label="Integrações" value={servicos.length} />
          <Kpi icon="check" label="Online" value={online} accent="--green" />
          <Kpi icon="alert" label="Pendentes" value={pendentes} accent="--amber" />
        </div>

        <div className="two-col" style={{ marginTop: 16 }}>
          {servicos.map((it) => {
            const cor = corStatus(it.status);
            return (
              <div className="card" key={it.key}>
                <div className="card-h">
                  <span className="ic" style={{
                    width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center',
                    background: `var(--${cor}-soft)`, color: `var(--${cor})`,
                  }}><Icon name={it.icon} size={15} /></span>
                  <h3>{it.nome}</h3>
                  <Pill kind={cor} dot>{labelStatus(it.status)}</Pill>
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
            );
          })}
          {carregando && servicos.length === 0 && <span className="faint" style={{ fontStyle: 'italic' }}>Testando conexões…</span>}
        </div>
      </div></div>
    </>
  );
}
