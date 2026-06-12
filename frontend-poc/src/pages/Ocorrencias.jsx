import React from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Chip, SortTh, TipoPill, PrioPill } from '../components/ui';
import { useFilters } from '../context/FiltersContext';
import { useTableFilter } from '../utils/useTableFilter';
import * as D from '../utils/mockData';

export function Ocorrencias() {
  const { range } = useFilters();
  const { search, setSearch, chips, toggleChip, sort, toggleSort, filtered } = useTableFilter(D.ocorrencias, {
    searchFields: ['ativo', 'empresa', 'descricao', 'id'],
  });

  const total = D.ocorrencias.length;
  const criticas = D.ocorrencias.filter((o) => o.prioridade === 'Crítica').length;
  const chamadosAbertos = D.ocorrencias.filter((o) => o.status === 'Chamado aberto').length;
  const falsosPos = D.ocorrencias.filter((o) => o.tipo === 'Falso Positivo').length;

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Monitoramento', 'Ocorrências']}>
        <div className="field"><Icon name="calendar" />{range}</div>
        <div className="field sm" style={{ height: 30 }}>
          <Icon name="search" size={14} />
          <input placeholder="Procurar ocorrência…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180 }} />
        </div>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Ocorrências" sub={`${total} ocorrências detectadas pela IA · janela ${range}`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          <Kpi icon="sparkles" label="Total de ocorrências" value={total} />
          <Kpi icon="alert" label="Prioridade crítica" value={criticas} accent="--red" />
          <Kpi icon="file" label="Chamados abertos" value={chamadosAbertos} accent="--amber" />
          <Kpi icon="check" label="Falsos positivos" value={falsosPos} accent="--green" />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h">
            <h3>Classificação</h3>
            <span className="sub">clique para filtrar</span>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              {D.tipos.map((t) => (
                <Chip key={t} active={chips.tipo === t} color={{ 'Falha Real': 'red', 'Oscilação Normal': 'green', 'Em Análise': 'amber', 'Falso Positivo': 'gray' }[t]} onClick={() => toggleChip('tipo', t)}>{t}</Chip>
              ))}
              <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 2px' }} />
              {D.prioridades.map((p) => (
                <Chip key={p} active={chips.prioridade === p} color={{ Crítica: 'red', Urgente: 'amber', Alta: 'purple', Normal: 'gray' }[p]} onClick={() => toggleChip('prioridade', p)}>{p}</Chip>
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
                <th>Classificação</th>
                <SortTh k="prioridade" label="Prioridade" sort={sort} onSort={toggleSort} className="c" />
                <SortTh k="score" label="Score" sort={sort} onSort={toggleSort} className="r" />
                <SortTh k="hora" label="Hora" sort={sort} onSort={toggleSort} className="r" />
                <th className="c">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="num" style={{ color: 'var(--text-dim)' }}>{o.id}</td>
                    <td className="cellmain">{o.ativo}</td>
                    <td className="muted">{o.empresa}</td>
                    <td className="muted" style={{ maxWidth: 320 }}>{o.descricao}</td>
                    <td><TipoPill v={o.tipo} /></td>
                    <td className="c"><PrioPill v={o.prioridade} /></td>
                    <td className="r num" style={{ color: o.score > 0.7 ? 'var(--red)' : o.score > 0.45 ? 'var(--amber)' : 'var(--text-dim)' }}>{o.score.toFixed(2)}</td>
                    <td className="r num faint">{o.hora}</td>
                    <td className="c">
                      <span className={'pill ' + (o.status === 'Chamado aberto' ? 'red' : o.status === 'Descartada' ? 'gray' : 'amber')}>{o.status}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nenhuma ocorrência corresponde aos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>
    </>
  );
}
