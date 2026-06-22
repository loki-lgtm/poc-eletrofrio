import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

const SIDEBAR_W_OPEN = '248px';
const SIDEBAR_W_COLLAPSED = '80px';

const NAV = [
  { items: [{ id: 'home', label: 'Página Inicial', icon: 'home' }] },
  { label: 'Monitoramento', items: [
    { id: 'telemetria', label: 'Telemetria ao Vivo', icon: 'activity' },
    { id: 'ocorrencias', label: 'Ocorrências', icon: 'bell' },
    { id: 'falhas', label: 'Falhas Operacionais', icon: 'alert' },
  ] },
  { label: 'Chamados', items: [
    { id: 'chamados_ativos', label: 'Chamados Ativos', icon: 'file', subKey: 'chamados', sub: [
      { id: 'operacao_chamado', label: 'Operação do Chamado' },
    ] },
    { id: 'relatorios', label: 'Relatório de Chamados', icon: 'barchart' },
  ] },
  { label: 'Gestão', items: [
    { id: 'empresas', label: 'Empresas / Ativos', icon: 'building', subKey: 'gestao', sub: [
      { id: 'ativos_ativos', label: 'Ativos ativos' },
      { id: 'inativos', label: 'Inativos' },
    ] },
    { id: 'manutencao', label: 'Em Manutenção', icon: 'wrench' },
    { id: 'permissoes', label: 'Funções / Permissões', icon: 'shield' },
  ] },
  { label: 'Sistema', items: [
    { id: 'conexao', label: 'Conexão', icon: 'link' },
    { id: 'fluxo', label: 'Fluxo de Mensagem', icon: 'flow' },
    { id: 'api', label: 'Conexão API', icon: 'server' },
    { id: 'analise', label: 'Análise', icon: 'linechart' },
    { id: 'config', label: 'Configuração', icon: 'settings' },
  ] },
];

export function Sidebar({ telaAtiva, setTelaAtiva }) {
  const [expands, setExpands] = useState({ chamados: true, gestao: true });
  const [collapsed, setCollapsed] = useState(false);
  const toggleExpand = (key) => setExpands((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_OPEN);
  }, [collapsed]);

  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
      <div className="sb-head">
        <div className="sb-logo">
          <Icon name="snow" size={17} style={{ color: '#fff' }} />
        </div>
        <div className="sb-brand">
          <b>Eletrofrio</b>
          <span>Monitoramento · IA</span>
        </div>
        <div className="sb-burger" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          <Icon name="menu" size={17} />
        </div>
      </div>
      <nav className="sb-nav">
        {NAV.map((group, gi) => (
          <div className="sb-group" key={gi}>
            {group.label && <div className="sb-group-label">{group.label}</div>}
            {group.items.map((it) => (
              <React.Fragment key={it.id}>
                <div
                  className={'sb-item' + (telaAtiva === it.id ? ' active' : '')}
                  title={collapsed ? it.label : undefined}
                  onClick={() => (it.sub && !collapsed ? toggleExpand(it.subKey) : setTelaAtiva(it.id))}
                >
                  <Icon name={it.icon} size={17} />
                  <span>{it.label}</span>
                  {it.sub && (
                    <Icon
                      name="chevR"
                      size={14}
                      className="chev"
                      style={{ transform: expands[it.subKey] ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  )}
                </div>
                {it.sub && expands[it.subKey] && !collapsed && (
                  <div className="sb-sub">
                    {it.sub.map((s) => (
                      <div
                        key={s.id}
                        className={'sb-item sb-sub-item' + (telaAtiva === s.id ? ' active' : '')}
                        onClick={() => setTelaAtiva(s.id)}
                      >
                        <span>{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="sb-avatar">EB</div>
        <div className="who">
          <b>Eduardo B.</b>
          <span>Supervisor</span>
        </div>
        <Icon name="more" size={16} style={{ marginLeft: 'auto', color: 'var(--text-faint)', cursor: 'pointer' }} />
      </div>
    </aside>
  );
}
