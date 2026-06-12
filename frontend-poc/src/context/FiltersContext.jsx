import React, { createContext, useContext, useState, useMemo } from 'react';

// Janelas de tempo globais — qualquer página pode ler/alterar o período ativo
// e os dados (séries, KPIs, tabelas) são recalculados de acordo.
export const RANGES = {
  '1h': { label: '1h', points: 12, stepMin: 5, unit: 'min', days: 1 / 24 },
  '24h': { label: '24h', points: 96, stepMin: 15, unit: 'hora', days: 1 },
  '7d': { label: '7d', points: 168, stepMin: 60, unit: 'dia', days: 7 },
  '30d': { label: '30d', points: 30, stepMin: 1440, unit: 'dia', days: 30 },
};

const FiltersContext = createContext(null);

export function FiltersProvider({ children }) {
  const [range, setRange] = useState('24h');
  const [empresa, setEmpresa] = useState('Todas');
  const [search, setSearch] = useState('');

  const value = useMemo(() => ({
    range, setRange, rangeInfo: RANGES[range],
    empresa, setEmpresa,
    search, setSearch,
  }), [range, empresa, search]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters deve ser usado dentro de FiltersProvider');
  return ctx;
}
