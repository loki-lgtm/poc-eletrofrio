import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

/* ---------------- Sparkline (mini area chart for KPI cards) ---------------- */
export function Sparkline({ data, color = 'var(--accent)', height = 40, width = 120 }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const id = 'spark-' + color.replace(/[^a-zA-Z0-9]/g, '');
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- Donut chart ---------------- */
export function Donut({ segments, size = 132, thickness = 17, center }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            innerRadius={size / 2 - thickness}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{center.value}</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{center.label}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Horizontal bars (meter rows, no chart lib needed) ---------------- */
export function HBars({ items, max }) {
  const m = max || Math.max(...items.map((i) => i.value)) || 1;
  return (
    <div className="col" style={{ gap: 11 }}>
      {items.map((it, i) => (
        <div className="kbar" key={i}>
          <span className="label" title={it.label}>{it.label}</span>
          <div className="meter grow"><i style={{ width: (it.value / m) * 100 + '%', background: it.color || 'var(--accent)' }} /></div>
          <span className="val">{it.display || it.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Dense histogram (two stacked bar series) ---------------- */
export function Histogram({ a, b, height = 150, colorA = 'var(--accent)', colorB = 'var(--red)', xLabels = [] }) {
  const data = a.map((v, i) => ({ i, a: Math.round(v), b: b ? Math.round(b[i]) : 0 }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }} barCategoryGap={1}>
          <Bar dataKey="a" stackId="s" fill={colorA} radius={[1.5, 1.5, 0, 0]} isAnimationActive={false} />
          {b && <Bar dataKey="b" stackId="s" fill={colorB} radius={[1.5, 1.5, 0, 0]} isAnimationActive={false} />}
        </BarChart>
      </ResponsiveContainer>
      {xLabels.length > 0 && (
        <div className="row" style={{ justifyContent: 'space-between', marginTop: -6 }}>
          {xLabels.map((lb, i) => (
            <span key={i} className="mono faint" style={{ fontSize: 10 }}>{lb}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Vertical bars with optional target line ---------------- */
export function VBars({ data, height = 150, color = 'var(--red)', labels = [], target }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
          <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          {target != null && <ReferenceLine y={target} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1.2} />}
        </BarChart>
      </ResponsiveContainer>
      {labels.length > 0 && (
        <div className="row" style={{ justifyContent: 'space-between', marginTop: -6 }}>
          {labels.map((lb, i) => (
            <span key={i} className="mono faint" style={{ fontSize: 10 }}>{lb}</span>
          ))}
        </div>
      )}
    </div>
  );
}
