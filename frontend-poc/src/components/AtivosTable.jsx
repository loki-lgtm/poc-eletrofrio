import React from 'react';
import { Chip, SortTh } from './ui';
import { useTableFilter } from '../utils/useTableFilter';

const SAUDE_LABEL = { green: 'Normal', amber: 'Atenção', red: 'Crítico', gray: '—' };
const STATUS_LABEL = { ativo: 'Ativo', manutencao: 'Manutenção', inativo: 'Inativo' };

export function AtivosTable({ items, showGrupo = true, showEmpresa = true, showStatus = false, selectable = false, selected, onToggle }) {
  const { search, setSearch, chips, toggleChip, sort, toggleSort, filtered } = useTableFilter(items, {
    searchFields: ['nome', 'empresa', 'grupo'],
  });

  return (
    <div className="card">
      <div className="card-h">
        <h3>Ativos</h3>
        <span className="sub">{filtered.length} de {items.length}</span>
        <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
          <div className="row" style={{ gap: 6 }}>
            {['green', 'amber', 'red'].map((s) => (
              <Chip key={s} active={chips.saude === s} color={s === 'red' ? 'red' : s === 'amber' ? 'amber' : 'green'} onClick={() => toggleChip('saude', s)}>{SAUDE_LABEL[s]}</Chip>
            ))}
          </div>
          <div className="field sm" style={{ height: 30 }}>
            <input placeholder="Procurar ativo…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 160 }} />
          </div>
        </div>
      </div>
      <div className="card-b flush" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead><tr>
            {selectable && <th style={{ width: 36 }} />}
            <SortTh k="nome" label="Ativo" sort={sort} onSort={toggleSort} />
            {showEmpresa && <SortTh k="empresa" label="Empresa" sort={sort} onSort={toggleSort} />}
            {showGrupo && <SortTh k="grupo" label="Grupo" sort={sort} onSort={toggleSort} />}
            <SortTh k="val" label="Leitura" sort={sort} onSort={toggleSort} className="r" />
            <SortTh k="score" label="Score IA" sort={sort} onSort={toggleSort} className="r" />
            <SortTh k="ultimaLeitura" label="Última leitura" sort={sort} onSort={toggleSort} className="r" />
            {showStatus && <th className="c">Status</th>}
            <th className="c">Saúde</th>
          </tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                {selectable && <td className="c"><input type="checkbox" checked={selected?.has(a.id) || false} onChange={() => onToggle?.(a.id)} /></td>}
                <td className="cellmain">{a.nome}</td>
                {showEmpresa && <td className="muted">{a.empresa}</td>}
                {showGrupo && <td className="muted">{a.grupo}</td>}
                <td className="r num">{a.val}<span className="faint" style={{ marginLeft: 3 }}>{a.unit}</span></td>
                <td className="r num" style={{ color: a.score > 0.7 ? 'var(--red)' : a.score > 0.45 ? 'var(--amber)' : 'var(--text-dim)' }}>{a.score.toFixed(2)}</td>
                <td className="r num faint">{a.ultimaLeitura}</td>
                {showStatus && <td className="c"><span className={'pill ' + (a.status === 'ativo' ? 'green' : a.status === 'manutencao' ? 'amber' : 'gray')}>{STATUS_LABEL[a.status]}</span></td>}
                <td className="c"><span className={'statusdot ' + a.statusDot} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={selectable ? 9 : 8} className="faint" style={{ textAlign: 'center', padding: 24 }}>Nenhum ativo corresponde aos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ativosKpis(items) {
  return {
    total: items.length,
    criticos: items.filter((a) => a.saude === 'red').length,
    atencao: items.filter((a) => a.saude === 'amber').length,
    normais: items.filter((a) => a.saude === 'green').length,
  };
}
