import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Modal, Switch } from './ui';

const PREFS_KEY = 'eletrofrio-analise-cards';

// Cards disponíveis para o painel de diagnóstico do pipeline preditivo (/pipeline-completo).
// `render` recebe a AnaliseResponse e devolve {value, color, sub} já formatados pro card.
export const CARD_DEFS = [
  { key: 'status_operacao', label: 'Status da operação', icon: 'activity',
    render: (a, critica) => ({ value: a?.status_operacao || '—', color: critica ? 'var(--red)' : 'var(--green)', sub: 'pipeline preditivo' }) },
  { key: 'horario_evento', label: 'Horário do evento', icon: 'clock',
    render: (a) => ({ value: a?.horario_evento || '—', color: 'var(--cyan)', sub: a?.sazonalidade || 'sazonalidade indisponível' }) },
  { key: 'eta_falha', label: 'ETA até falha crítica', icon: 'gauge',
    render: (a) => ({
      value: a?.eta_minutos != null ? `${a.eta_minutos} min` : '—',
      color: a?.eta_minutos != null && a.eta_minutos < 60 ? 'var(--red)' : 'var(--cyan)',
      sub: 'regressão linear · janela recente',
    }) },
  { key: 'tendencia_esforco', label: 'Tendência de esforço', icon: 'gauge',
    render: (a) => {
      const t = a?.tendencia_esforco;
      const color = t?.includes('CRÍTICA') ? 'var(--red)' : t?.includes('CRESCENTE') ? 'var(--amber)' : t ? 'var(--green)' : 'var(--text-faint)';
      return { value: t || '—', color, sub: 'válvula de expansão · Isolation Forest' };
    } },
  { key: 'alarme', label: 'Código de alarme', icon: 'alert',
    render: (a) => ({
      value: a?.codigo_alarme || 'Nenhum',
      color: a?.codigo_alarme ? 'var(--red)' : 'var(--green)',
      sub: a?.alarme_severidade ? `severidade ${a.alarme_severidade}` : 'base RAG',
    }) },
  { key: 'risco_perda', label: 'Risco de perda', icon: 'dollar',
    render: (a) => ({ value: a?.risco_perda_rs || '—', color: 'var(--red)', sub: 'mercadoria em risco' }) },
  { key: 'desperdicio_energia', label: 'Desperdício de energia', icon: 'zap',
    render: (a) => ({ value: a?.desperdicio_energia_rs || '—', color: 'var(--amber)', sub: 'estimativa diária' }) },
];

const DEFAULT_ORDER = CARD_DEFS.map((c) => c.key);

function carregarPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { order: DEFAULT_ORDER, hidden: [] };
    const parsed = JSON.parse(raw);
    // cards novos adicionados depois entram no fim, sem perder a preferência já salva
    const conhecidos = new Set(parsed.order);
    const faltantes = DEFAULT_ORDER.filter((k) => !conhecidos.has(k));
    return { order: [...parsed.order, ...faltantes], hidden: parsed.hidden || [] };
  } catch {
    return { order: DEFAULT_ORDER, hidden: [] };
  }
}

// Preferência compartilhada — a mesma escolha/ordem vale em qualquer tela que use o painel.
export function useAnaliseCardsPrefs() {
  const [prefs, setPrefs] = useState(carregarPrefs);
  useEffect(() => { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }, [prefs]);
  return [prefs, setPrefs];
}

export function AnaliseCardsPanel({ analise, loading, critica }) {
  const [prefs, setPrefs] = useAnaliseCardsPrefs();
  const [config, setConfig] = useState(false);
  const defByKey = useMemo(() => Object.fromEntries(CARD_DEFS.map((c) => [c.key, c])), []);
  const visiveis = prefs.order.filter((k) => !prefs.hidden.includes(k) && defByKey[k]);

  const mover = (key, dir) => {
    setPrefs((p) => {
      const idx = p.order.indexOf(key);
      const alvo = idx + dir;
      if (alvo < 0 || alvo >= p.order.length) return p;
      const novo = [...p.order];
      [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
      return { ...p, order: novo };
    });
  };
  const alternar = (key) => {
    setPrefs((p) => ({
      ...p,
      hidden: p.hidden.includes(key) ? p.hidden.filter((k) => k !== key) : [...p.hidden, key],
    }));
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn ghost sm" onClick={() => setConfig(true)}><Icon name="settings" size={13} />Personalizar cards</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', marginBottom: 16 }}>
        {visiveis.length === 0 && (
          <div className="card faint" style={{ padding: '13px 15px', fontSize: 12.5 }}>Nenhum card selecionado — abra "Personalizar cards" para escolher.</div>
        )}
        {visiveis.map((key) => {
          const def = defByKey[key];
          const r = def.render(analise, critica);
          return (
            <div className="card" key={key} style={{ padding: '13px 15px', minWidth: 0 }}>
              <span className="faint" style={{ fontSize: 12 }}>{def.label}</span>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, margin: '6px 0 2px', color: loading ? 'var(--text-faint)' : r.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {loading ? '…' : r.value}
              </div>
              <span className="faint mono" style={{ fontSize: 11 }}>{r.sub}</span>
            </div>
          );
        })}
      </div>

      <Modal open={config} onClose={() => setConfig(false)} title="Personalizar cards" sub="Escolha e organize os cards de diagnóstico" width={460}
        footer={<button className="btn primary sm" onClick={() => setConfig(false)}>Concluir</button>}>
        <div className="col" style={{ gap: 0 }}>
          {prefs.order.map((key, i) => {
            const def = defByKey[key];
            if (!def) return null;
            const oculto = prefs.hidden.includes(key);
            return (
              <div className="row" key={key} style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: i < prefs.order.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="row" style={{ gap: 8 }}>
                  <Icon name={def.icon} size={15} style={{ opacity: oculto ? 0.4 : 1 }} />
                  <span style={{ fontSize: 13, opacity: oculto ? 0.5 : 1 }}>{def.label}</span>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn ghost sm" disabled={i === 0} onClick={() => mover(key, -1)} style={{ padding: '0 7px' }}><Icon name="arrowUp" size={13} /></button>
                  <button className="btn ghost sm" disabled={i === prefs.order.length - 1} onClick={() => mover(key, 1)} style={{ padding: '0 7px' }}><Icon name="arrowDown" size={13} /></button>
                  <Switch on={!oculto} onClick={() => alternar(key)} />
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
