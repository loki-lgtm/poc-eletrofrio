import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, PrioPill, EstadoPill, Pill, Modal } from '../components/ui';
import * as D from '../utils/mockData';

export function OperacaoChamado() {
  const [chamados, setChamados] = useState(D.chamados);
  const [selecionado, setSelecionado] = useState(chamados[0].id);
  const [estado, setEstado] = useState(chamados[0].estado);
  const [modal, setModal] = useState(null);
  const [agendamento, setAgendamento] = useState('');
  const chamado = chamados.find((c) => c.id === selecionado);
  const ocorrencia = D.ocorrencias.find((o) => o.ativo === chamado.eq);

  const selecionar = (c) => { setSelecionado(c.id); setEstado(c.estado); };

  const atualizarChamado = (patch) => {
    setChamados((prev) => prev.map((c) => (c.id === selecionado ? { ...c, ...patch } : c)));
  };

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Chamados', 'Chamados Ativos', 'Operação do Chamado']}>
        <button className="btn" onClick={() => window.location.reload()}><Icon name="refresh" />Atualizar</button>
      </Topbar>
      <div className="scroll"><div className="page page-wide">
        <PageHead title="Operação do Chamado" sub={`${chamado.id} · ${chamado.titulo}`} />

        <div className="grid" style={{ gridTemplateColumns: '320px minmax(0,1fr)', gap: 16 }}>
          <div className="card">
            <div className="card-h"><h3>Chamados</h3><span className="sub">{chamados.length}</span>
              <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('todos')}>Ver todos<Icon name="chevR" size={14} /></button>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0', maxHeight: 560, overflowY: 'auto' }}>
              {chamados.slice(0, 8).map((c, i) => (
                <div
                  key={c.id}
                  className="row"
                  onClick={() => selecionar(c)}
                  style={{
                    justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer',
                    borderBottom: i < 7 ? '1px solid var(--border)' : 'none',
                    background: c.id === selecionado ? 'var(--hover)' : 'transparent',
                  }}
                >
                  <div className="col">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.id}</span>
                    <span className="faint" style={{ fontSize: 11.5 }}>{c.titulo}</span>
                  </div>
                  <PrioPill v={c.prioridade} />
                </div>
              ))}
            </div>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <div className="card">
              <div className="card-h">
                <h3>{chamado.titulo}</h3>
                <span className="sub">{chamado.eq} · {chamado.emp}</span>
                <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
                  <PrioPill v={chamado.prioridade} />
                  <EstadoPill v={estado} />
                </div>
              </div>
              <div className="card-b">
                <div className="row" style={{ gap: 28, flexWrap: 'wrap' }}>
                  <div><span className="faint" style={{ fontSize: 11.5 }}>Técnico</span><div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{chamado.tecnico}</div></div>
                  <div><span className="faint" style={{ fontSize: 11.5 }}>Aberto há</span><div className="num" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{chamado.dias}d</div></div>
                  <div><span className="faint" style={{ fontSize: 11.5 }}>Abertura</span><div className="num" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{chamado.abertura}</div></div>
                  <div><span className="faint" style={{ fontSize: 11.5 }}>Origem</span><div style={{ marginTop: 3 }}>{chamado.origem === 'IA' ? <span className="pill blue"><Icon name="sparkles" size={11} />IA</span> : <span className="tag">Manual</span>}</div></div>
                  {chamado.agendamento && (
                    <div><span className="faint" style={{ fontSize: 11.5 }}>Agendado para</span><div className="num" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3, color: 'var(--cyan)' }}>{chamado.agendamento}</div></div>
                  )}
                </div>
                <div className="divider" style={{ margin: '16px 0' }} />
                <div>
                  <span className="faint" style={{ fontSize: 11.5 }}>SLA consumido</span>
                  <div className="row" style={{ gap: 9, marginTop: 6 }}>
                    <div className="meter grow"><i style={{ width: Math.min(100, chamado.sla) + '%', background: chamado.sla > 100 ? 'var(--red)' : chamado.sla > 80 ? 'var(--amber)' : 'var(--green)' }} /></div>
                    <span className="num" style={{ fontSize: 12.5 }}>{chamado.sla > 100 ? 'Vencido' : chamado.sla + '%'}</span>
                  </div>
                </div>
                {ocorrencia && (
                  <>
                    <div className="divider" style={{ margin: '16px 0' }} />
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, padding: 12 }}>
                      <span className="pill blue"><Icon name="sparkles" size={11} />Diagnóstico IA</span>
                      <p style={{ margin: '10px 0 0', lineHeight: 1.6, fontSize: 12.5 }}>{ocorrencia.descricao}</p>
                      <div className="row" style={{ marginTop: 10, gap: 8 }}>
                        <span className="faint" style={{ fontSize: 12 }}>Score de anomalia</span>
                        <span className="num" style={{ color: ocorrencia.score > 0.7 ? 'var(--red)' : 'var(--amber)' }}>{ocorrencia.score.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Ações</h3></div>
              <div className="card-b row" style={{ gap: 10, flexWrap: 'wrap' }}>
                {['Aberto', 'Em andamento', 'Aguardando aprovação', 'Resolvido', 'Fechado'].map((e) => (
                  <button key={e} className={'btn sm' + (estado === e ? ' primary' : '')} onClick={() => { setEstado(e); atualizarChamado({ estado: e }); }}>{e}</button>
                ))}
                <div className="divider" style={{ width: '100%', margin: '4px 0' }} />
                <button className="btn sm" onClick={() => setModal('tecnico')}><Icon name="users" size={13} />Atribuir técnico</button>
                <button className="btn sm" onClick={() => { setAgendamento(chamado.agendamento || ''); setModal('agendar'); }}><Icon name="calendar" size={13} />Agendar</button>
              </div>
            </div>
          </div>
        </div>
      </div></div>

      <Modal open={modal === 'tecnico'} onClose={() => setModal(null)} title="Atribuir técnico" sub={`${chamado.id} · ${chamado.titulo}`}
        footer={<>
          <button className="btn ghost sm" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn primary sm" onClick={() => setModal(null)}>Confirmar</button>
        </>}>
        <div className="form-row">
          <label className="lbl">Técnico responsável<span>O chamado será atribuído imediatamente</span></label>
          <select className="inp" value={chamado.tecnico} onChange={(e) => atualizarChamado({ tecnico: e.target.value })}>
            {D.tecnicos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Modal>

      <Modal open={modal === 'agendar'} onClose={() => setModal(null)} title="Agendar visita técnica" sub={`${chamado.id} · ${chamado.titulo}`}
        footer={<>
          <button className="btn ghost sm" onClick={() => setModal(null)}>Cancelar</button>
          <button className="btn primary sm" onClick={() => { atualizarChamado({ agendamento: agendamento }); setModal(null); }}>Salvar agendamento</button>
        </>}>
        <div className="form-row">
          <label className="lbl">Data e hora<span>Janela prevista para atendimento em campo</span></label>
          <input className="inp" type="datetime-local" value={agendamento} onChange={(e) => setAgendamento(e.target.value)} />
        </div>
      </Modal>

      <Modal open={modal === 'todos'} onClose={() => setModal(null)} title="Todos os chamados" sub={`${chamados.length} chamados`} width={620}
        footer={<button className="btn primary sm" onClick={() => setModal(null)}>Fechar</button>}>
        <div className="col" style={{ gap: 0 }}>
          {chamados.map((c, i) => (
            <div
              key={c.id}
              className="row"
              onClick={() => { selecionar(c); setModal(null); }}
              style={{ justifyContent: 'space-between', padding: '9px 4px', cursor: 'pointer', borderBottom: i < chamados.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="col">
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.id} · {c.titulo}</span>
                <span className="faint" style={{ fontSize: 11.5 }}>{c.emp} · {c.eq} · {c.tecnico}</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <PrioPill v={c.prioridade} />
                <EstadoPill v={c.estado} />
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
