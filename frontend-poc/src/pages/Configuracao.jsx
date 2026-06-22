import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Switch, Modal } from '../components/ui';
import { useFilters, RANGES } from '../context/FiltersContext';
import { useTheme } from '../context/ThemeContext';

const SECTIONS = [
  { id: 'geral', label: 'Geral', icon: 'settings' },
  { id: 'notificacoes', label: 'Notificações', icon: 'bell' },
  { id: 'ia', label: 'IA / Diagnóstico', icon: 'sparkles' },
  { id: 'integracoes', label: 'Integrações', icon: 'link' },
];

export function Configuracao() {
  const [secao, setSecao] = useState('geral');
  const { range, setRange, empresa, setEmpresa } = useFilters();
  const { theme, setTheme } = useTheme();
  const [toggles, setToggles] = useState({
    whatsapp: true, email: true, chamadoAuto: true, rag: true, isolationForest: true,
  });
  const toggle = (k) => setToggles((p) => ({ ...p, [k]: !p[k] }));
  const [salvo, setSalvo] = useState(false);

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Sistema', 'Configuração']}>
        <button className="btn primary" onClick={() => setSalvo(true)}><Icon name="check" />Salvar alterações</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Configuração" sub="Preferências do painel e do pipeline de IA" />

        <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div className="settings-nav">
            {SECTIONS.map((s) => (
              <div key={s.id} className={'sn' + (secao === s.id ? ' on' : '')} onClick={() => setSecao(s.id)}>
                <Icon name={s.icon} />{s.label}
              </div>
            ))}
          </div>

          <div className="card" style={{ flex: 1 }}>
            {secao === 'geral' && (
              <div className="card-b">
                <div className="form-row">
                  <div className="lbl"><b>Janela de tempo padrão</b><span>Período inicial exibido na Telemetria ao Vivo</span></div>
                  <div className="ctrl">
                    <select className="inp" value={range} onChange={(e) => setRange(e.target.value)}>
                      {Object.keys(RANGES).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>Empresa padrão</b><span>Filtro aplicado por padrão ao abrir o painel</span></div>
                  <div className="ctrl">
                    <select className="inp" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
                      <option value="Todas">Todas as empresas</option>
                      <option>Supermercado BomPreço</option>
                      <option>Rede FrioBom</option>
                      <option>Atacadão Norte</option>
                      <option>Mercado Central</option>
                      <option>SuperFrio Ltda</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>Tema</b><span>Aparência do painel</span></div>
                  <div className="ctrl">
                    <div className="seg">
                      <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Icon name="sun" size={13} />Claro</button>
                      <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Icon name="moon" size={13} />Escuro</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {secao === 'notificacoes' && (
              <div className="card-b">
                <div className="form-row">
                  <div className="lbl"><b>WhatsApp (Aumbler)</b><span>Notificar técnicos e gestores via WhatsApp quando uma ocorrência crítica é detetada</span></div>
                  <div className="ctrl"><Switch on={toggles.whatsapp} onClick={() => toggle('whatsapp')} /></div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>E-mail</b><span>Enviar resumo diário de ocorrências e chamados</span></div>
                  <div className="ctrl"><Switch on={toggles.email} onClick={() => toggle('email')} /></div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>Abertura automática de chamado</b><span>Abrir chamado técnico automaticamente quando score IA &gt; 0.75</span></div>
                  <div className="ctrl"><Switch on={toggles.chamadoAuto} onClick={() => toggle('chamadoAuto')} /></div>
                </div>
              </div>
            )}

            {secao === 'ia' && (
              <div className="card-b">
                <div className="form-row">
                  <div className="lbl"><b>Isolation Forest</b><span>Deteção de anomalias em tempo real a partir da telemetria</span></div>
                  <div className="ctrl"><Switch on={toggles.isolationForest} onClick={() => toggle('isolationForest')} /></div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>Diagnóstico RAG (LlamaIndex)</b><span>Gerar diagnóstico textual com base nos manuais técnicos dos equipamentos</span></div>
                  <div className="ctrl"><Switch on={toggles.rag} onClick={() => toggle('rag')} /></div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>Limiar de score crítico</b><span>Score mínimo para classificar uma ocorrência como crítica</span></div>
                  <div className="ctrl"><input className="inp" defaultValue="0.75" style={{ maxWidth: 100 }} /></div>
                </div>
              </div>
            )}

            {secao === 'integracoes' && (
              <div className="card-b">
                <div className="form-row">
                  <div className="lbl"><b>API Galileo</b><span>Endpoint base do backend de telemetria</span></div>
                  <div className="ctrl"><input className="inp mono" defaultValue="http://localhost:8000" /></div>
                </div>
                <div className="form-row">
                  <div className="lbl"><b>API Aumbler (WhatsApp)</b><span>Token de acesso para envio de mensagens</span></div>
                  <div className="ctrl"><input className="inp mono" type="password" placeholder="••••••••••••" /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div></div>

      <Modal open={salvo} onClose={() => setSalvo(false)} title="Alterações salvas" sub="Configuração do painel"
        footer={<button className="btn primary sm" onClick={() => setSalvo(false)}>Fechar</button>}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="pill green"><Icon name="check" size={12} />Sucesso</span>
          <span style={{ fontSize: 13 }}>As preferências foram atualizadas.</span>
        </div>
      </Modal>
    </>
  );
}
