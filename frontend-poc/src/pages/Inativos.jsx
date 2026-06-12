import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Modal } from '../components/ui';
import { AtivosTable } from '../components/AtivosTable';
import * as D from '../utils/mockData';

export function Inativos() {
  const [items, setItems] = useState(D.inativos);
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [modal, setModal] = useState(false);

  const toggle = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const reativar = () => {
    setItems((prev) => prev.filter((a) => !selecionados.has(a.id)));
    setSelecionados(new Set());
    setModal(false);
  };

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Gestão', 'Empresas / Ativos', 'Inativos']}>
        <button className="btn primary" disabled={selecionados.size === 0} onClick={() => setModal(true)}><Icon name="plus" />Reativar selecionados{selecionados.size > 0 ? ` (${selecionados.size})` : ''}</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Ativos inativos" sub={`${items.length} equipamentos sem monitoramento ativo`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="cpu" label="Total inativos" value={items.length} />
          <Kpi icon="building" label="Empresas afetadas" value={new Set(items.map((a) => a.empresa)).size} />
          <Kpi icon="clock" label="Sem leitura há" value="—" sub={<span className="faint">monitoramento desligado</span>} />
        </div>

        <div style={{ marginTop: 16 }}>
          <AtivosTable items={items} selectable selected={selecionados} onToggle={toggle} />
        </div>
      </div></div>

      <Modal open={modal} onClose={() => setModal(false)} title="Reativar ativos" sub={`${selecionados.size} equipamento(s) selecionado(s)`}
        footer={<>
          <button className="btn ghost sm" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn primary sm" onClick={reativar}>Confirmar reativação</button>
        </>}>
        <div className="col" style={{ gap: 6 }}>
          {items.filter((a) => selecionados.has(a.id)).map((a) => (
            <div className="row" key={a.id} style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span>{a.nome}</span><span className="faint">{a.empresa}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>O monitoramento será reativado imediatamente após a confirmação.</p>
      </Modal>
    </>
  );
}
