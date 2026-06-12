import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Chip, SortTh, PrioPill, Pill, Modal } from '../components/ui';
import { useTableFilter } from '../utils/useTableFilter';
import * as D from '../utils/mockData';

export function Manutencao() {
  const { search, setSearch, chips, toggleChip, sort, toggleSort, filtered } = useTableFilter(D.manutencoes, {
    searchFields: ['ativo', 'empresa', 'tecnico', 'id'],
  });
  const [agendar, setAgendar] = useState(false);

  const total = D.manutencoes.length;
  const atrasadas = D.manutencoes.filter((m) => m.atraso).length;
  const preventivas = D.manutencoes.filter((m) => m.tipo === 'Preventiva').length;
  const corretivas = D.manutencoes.filter((m) => m.tipo === 'Corretiva').length;

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Gestão', 'Em Manutenção']}>
        <div className="field sm" style={{ height: 30 }}>
          <Icon name="search" size={14} />
          <input placeholder="Procurar…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180 }} />
        </div>
        <button className="btn primary" onClick={() => setAgendar(true)}><Icon name="plus" />Agendar manutenção</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Em Manutenção" sub={`${total} equipamentos com manutenção agendada ou em andamento`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          <Kpi icon="wrench" label="Total em manutenção" value={total} />
          <Kpi icon="alert" label="Atrasadas" value={atrasadas} accent="--red" />
          <Kpi icon="check" label="Preventivas" value={preventivas} accent="--green" />
          <Kpi icon="zap" label="Corretivas" value={corretivas} accent="--amber" />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h">
            <h3>Manutenções</h3>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              <Chip active={chips.tipo === 'Preventiva'} color="green" onClick={() => toggleChip('tipo', 'Preventiva')}>Preventiva</Chip>
              <Chip active={chips.tipo === 'Corretiva'} color="amber" onClick={() => toggleChip('tipo', 'Corretiva')}>Corretiva</Chip>
            </div>
          </div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <SortTh k="id" label="OS" sort={sort} onSort={toggleSort} />
                <SortTh k="ativo" label="Ativo" sort={sort} onSort={toggleSort} />
                <SortTh k="empresa" label="Empresa" sort={sort} onSort={toggleSort} />
                <SortTh k="grupo" label="Grupo" sort={sort} onSort={toggleSort} />
                <SortTh k="tipo" label="Tipo" sort={sort} onSort={toggleSort} />
                <SortTh k="tecnico" label="Técnico" sort={sort} onSort={toggleSort} />
                <SortTh k="dataAgendada" label="Data" sort={sort} onSort={toggleSort} className="r" />
                <SortTh k="prioridade" label="Prioridade" sort={sort} onSort={toggleSort} className="c" />
                <th className="c">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td className="num" style={{ color: 'var(--text-dim)' }}>{m.id}</td>
                    <td className="cellmain">{m.ativo}</td>
                    <td className="muted">{m.empresa}</td>
                    <td className="muted">{m.grupo}</td>
                    <td>{m.tipo}</td>
                    <td className="muted">{m.tecnico}</td>
                    <td className="r num faint">{m.dataAgendada}</td>
                    <td className="c"><PrioPill v={m.prioridade} /></td>
                    <td className="c">
                      <Pill kind={m.atraso ? 'red' : 'amber'} dot>{m.atraso ? 'Atrasada' : 'Agendada'}</Pill>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nenhuma manutenção corresponde aos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>

      <Modal open={agendar} onClose={() => setAgendar(false)} title="Agendar manutenção" sub="Nova ordem de serviço"
        footer={<>
          <button className="btn ghost sm" onClick={() => setAgendar(false)}>Cancelar</button>
          <button className="btn primary sm" onClick={() => setAgendar(false)}>Agendar</button>
        </>}>
        <div className="form-row"><label className="lbl">Ativo</label>
          <select className="inp">{D.ativos.map((a) => <option key={a.id}>{a.nome}</option>)}</select></div>
        <div className="form-row"><label className="lbl">Tipo</label>
          <select className="inp"><option>Preventiva</option><option>Corretiva</option></select></div>
        <div className="form-row"><label className="lbl">Técnico</label>
          <select className="inp">{D.tecnicos.filter((t) => t !== '—').map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="form-row"><label className="lbl">Data</label>
          <input className="inp" type="date" /></div>
      </Modal>
    </>
  );
}
