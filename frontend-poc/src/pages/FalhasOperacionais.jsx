import React from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Chip, SortTh, PrioPill, Pill } from '../components/ui';
import { useFilters } from '../context/FiltersContext';
import { useTableFilter } from '../utils/useTableFilter';
import * as D from '../utils/mockData';

export function FalhasOperacionais() {
  const { range } = useFilters();
  const { search, setSearch, chips, toggleChip, sort, toggleSort, filtered } = useTableFilter(D.falhas, {
    searchFields: ['ativo', 'empresa', 'descricao', 'id'],
  });

  const total = D.falhas.length;
  const emAndamento = D.falhas.filter((f) => f.status === 'Em andamento').length;
  const resolvidas = D.falhas.filter((f) => f.status === 'Resolvida').length;
  const impactoTotal = D.falhas.reduce((s, f) => s + Number(f.impacto.replace(/\D/g, '')), 0);

  const estados = ['Em andamento', 'Resolvida'];

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Monitoramento', 'Falhas Operacionais']}>
        <div className="field"><Icon name="calendar" />{range}</div>
        <div className="field sm" style={{ height: 30 }}>
          <Icon name="search" size={14} />
          <input placeholder="Procurar falha…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180 }} />
        </div>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Falhas Operacionais" sub={`${total} falhas reais classificadas pela IA · janela ${range}`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          <Kpi icon="alert" label="Falhas reais" value={total} accent="--red" />
          <Kpi icon="clock" label="Em andamento" value={emAndamento} accent="--amber" />
          <Kpi icon="check" label="Resolvidas" value={resolvidas} accent="--green" />
          <Kpi icon="dollar" label="Impacto estimado" value={'R$ ' + impactoTotal.toLocaleString('pt-BR')} accent="--red" />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h">
            <h3>Falhas registadas</h3>
            <span className="sub">clique para filtrar por estado</span>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              {estados.map((e) => (
                <Chip key={e} active={chips.status === e} color={e === 'Resolvida' ? 'green' : 'amber'} onClick={() => toggleChip('status', e)}>{e}</Chip>
              ))}
            </div>
          </div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <SortTh k="id" label="ID" sort={sort} onSort={toggleSort} />
                <SortTh k="ativo" label="Ativo" sort={sort} onSort={toggleSort} />
                <SortTh k="empresa" label="Empresa" sort={sort} onSort={toggleSort} />
                <th>Descrição</th>
                <SortTh k="inicio" label="Início" sort={sort} onSort={toggleSort} className="r" />
                <SortTh k="duracao" label="Duração" sort={sort} onSort={toggleSort} className="r" />
                <SortTh k="impacto" label="Impacto" sort={sort} onSort={toggleSort} className="r" />
                <SortTh k="prioridade" label="Prioridade" sort={sort} onSort={toggleSort} className="c" />
                <th className="c">Estado</th>
              </tr></thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="num" style={{ color: 'var(--text-dim)' }}>{f.id}</td>
                    <td className="cellmain">{f.ativo}</td>
                    <td className="muted">{f.empresa}</td>
                    <td className="muted" style={{ maxWidth: 320 }}>{f.descricao}</td>
                    <td className="r num faint">{f.inicio}</td>
                    <td className="r num">{f.duracao}</td>
                    <td className="r num" style={{ color: 'var(--red)' }}>{f.impacto}</td>
                    <td className="c"><PrioPill v={f.prioridade} /></td>
                    <td className="c">
                      <Pill kind={f.status === 'Resolvida' ? 'green' : 'amber'} dot>{f.status}</Pill>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nenhuma falha corresponde aos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>
    </>
  );
}
