import React from 'react';
import { Icon } from './Icon';

export function Topbar({ crumbs, children }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevR" size={13} className="sep" />}
            {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-actions">{children}</div>
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div className="pt">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Kpi({ icon, label, value, unit, sub, foot, spark, accent = '--accent' }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="ic" style={{ color: `var(${accent})` }}>
          <Icon name={icon} size={15} />
        </span>
        {label}
      </div>
      <div className="kpi-val">
        {value}
        {unit && <span style={{ fontSize: 15, color: 'var(--text-faint)', marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {foot && (
        <div className="kpi-foot">
          {foot.map((f, i) => (
            <div className="m" key={i}>
              <b style={{ color: f.color || 'var(--text)' }}>{f.value}</b>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
      {spark && <div className="kpi-spark">{spark}</div>}
    </div>
  );
}

const PRIO_MAP = { Crítica: 'red', Urgente: 'amber', Alta: 'purple', Normal: 'gray' };
const ESTADO_MAP = { Aberto: 'blue', 'Em andamento': 'amber', 'Aguardando aprovação': 'purple', Resolvido: 'green', Fechado: 'gray' };
const TIPO_MAP = { 'Falha Real': 'red', 'Oscilação Normal': 'green', 'Em Análise': 'amber', 'Falso Positivo': 'gray' };

export function Pill({ kind, children, dot }) {
  return (
    <span className={'pill ' + kind}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
export function PrioPill({ v }) {
  return <Pill kind={PRIO_MAP[v] || 'gray'} dot>{v}</Pill>;
}
export function EstadoPill({ v }) {
  return <Pill kind={ESTADO_MAP[v] || 'gray'} dot>{v}</Pill>;
}
export function TipoPill({ v }) {
  return <Pill kind={TIPO_MAP[v] || 'gray'} dot>{v}</Pill>;
}

// Chip clicável — usado para filtrar tabelas por prioridade/estado/tipo/status etc.
export function Chip({ active, onClick, color, children }) {
  return (
    <span
      className={'pill ' + (active ? color || 'blue' : 'gray')}
      onClick={onClick}
      style={{ cursor: 'pointer', userSelect: 'none', border: active ? 'none' : '1px solid var(--border-2)', opacity: active ? 1 : 0.75 }}
    >
      {children}
    </span>
  );
}

// Cabeçalho de coluna ordenável — usado em conjunto com useTableFilter
export function SortTh({ k, label, sort, onSort, className }) {
  return (
    <th className={(className || '') + ' sortable'} onClick={() => onSort(k)}>
      {label}{sort?.k === k && <span style={{ marginLeft: 4, opacity: .7 }}>{sort.dir === 'desc' ? '↓' : '↑'}</span>}
    </th>
  );
}

export function Switch({ on, onClick }) {
  return <span className={'switch' + (on ? ' on' : '')} onClick={onClick}><i /></span>;
}

export function Modal({ open, onClose, title, sub, children, footer, width = 480 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <h3>{title}</h3>
            {sub && <span className="sub">{sub}</span>}
          </div>
          <button className="btn ghost sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Scaffold({ icon, title, desc, action }) {
  return (
    <div className="empty">
      <div className="ic"><Icon name={icon} size={24} /></div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
