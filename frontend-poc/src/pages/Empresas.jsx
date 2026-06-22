import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Modal } from '../components/ui';
import { AtivosTable, ativosKpis } from '../components/AtivosTable';
import * as D from '../utils/mockData';

let proximoAtivoId = 9000;

export function Empresas({ setTelaAtiva }) {
  const [ativos, setAtivos] = useState(D.ativos);
  const k = ativosKpis(ativos);
  const [novoAtivo, setNovoAtivo] = useState(false);
  const [nomeAtivo, setNomeAtivo] = useState('');
  const [empresaAtivo, setEmpresaAtivo] = useState(D.sites[0].name);
  const [grupoAtivo, setGrupoAtivo] = useState(D.grupos[0].nome);

  const salvarAtivo = () => {
    if (!nomeAtivo.trim()) return;
    setAtivos((prev) => [
      {
        id: proximoAtivoId++, nome: nomeAtivo, empresa: empresaAtivo, grupo: grupoAtivo,
        unit: '°C', val: 0, score: 0, status: 'ativo', saude: 'green', statusDot: 'green', ultimaLeitura: '—',
      },
      ...prev,
    ]);
    setNomeAtivo('');
    setNovoAtivo(false);
  };

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Gestão', 'Empresas / Ativos']}>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Atualizar</button>
        <button className="btn primary" onClick={() => setNovoAtivo(true)}><Icon name="plus" />Novo ativo</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Empresas / Ativos" sub={`${D.empresas.length} empresas · ${k.total} ativos monitorados`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          <Kpi icon="building" label="Empresas" value={D.empresas.length} />
          <Kpi icon="cpu" label="Ativos monitorados" value={k.total} />
          <Kpi icon="check" label="Operando normalmente" value={k.normais} accent="--green" />
          <Kpi icon="alert" label="Críticos / em atenção" value={k.criticos + k.atencao} accent="--red" />
        </div>

        <div className="row" style={{ justifyContent: 'space-between', margin: '20px 0 12px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Empresas</h2>
        </div>
        <div className="three-col" style={{ marginBottom: 22 }}>
          {D.empresas.map((emp) => {
            const itens = ativos.filter((a) => a.empresa === emp.nome);
            const criticos = itens.filter((a) => a.saude === 'red').length;
            return (
              <div className="card" key={emp.id} style={{ padding: '16px 17px' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="ic" style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <Icon name="building" size={17} />
                  </span>
                  {criticos > 0 && <span className="pill red">{criticos} crítico{criticos > 1 ? 's' : ''}</span>}
                </div>
                <div style={{ margin: '13px 0 2px' }}><b style={{ fontSize: 14 }}>{emp.nome}</b></div>
                <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 15px' }}>{itens.length} ativos monitorados</p>
                <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setTelaAtiva?.('ativos_ativos')}>
                  Ver ativos<Icon name="chevR" size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <AtivosTable items={ativos} showStatus />
      </div></div>

      <Modal open={novoAtivo} onClose={() => setNovoAtivo(false)} title="Novo ativo" sub="Cadastro de equipamento monitorado"
        footer={<>
          <button className="btn ghost sm" onClick={() => setNovoAtivo(false)}>Cancelar</button>
          <button className="btn primary sm" disabled={!nomeAtivo.trim()} onClick={salvarAtivo}>Salvar</button>
        </>}>
        <div className="form-row"><label className="lbl">Nome do ativo</label>
          <input className="inp" placeholder="Ex: Câmara Fria 06" value={nomeAtivo} onChange={(e) => setNomeAtivo(e.target.value)} /></div>
        <div className="form-row"><label className="lbl">Empresa</label>
          <select className="inp" value={empresaAtivo} onChange={(e) => setEmpresaAtivo(e.target.value)}>
            {D.sites.map((s) => <option key={s.id}>{s.name}</option>)}
          </select></div>
        <div className="form-row"><label className="lbl">Grupo</label>
          <select className="inp" value={grupoAtivo} onChange={(e) => setGrupoAtivo(e.target.value)}>
            {D.grupos.map((g) => <option key={g.id}>{g.nome}</option>)}
          </select></div>
      </Modal>
    </>
  );
}
