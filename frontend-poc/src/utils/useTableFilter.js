import { useMemo, useState } from 'react';

// Hook genérico de tabela: busca textual + chips de filtro (clicáveis) + ordenação.
// `chipFields` define quais colunas podem virar chips de filtro (ex: ['prioridade','status']).
export function useTableFilter(rows, { searchFields = [], initialSort } = {}) {
  const [search, setSearch] = useState('');
  const [chips, setChips] = useState({}); // { campo: valor }
  const [sort, setSort] = useState(initialSort || null);

  const toggleChip = (field, value) => {
    setChips((prev) => (prev[field] === value ? { ...prev, [field]: null } : { ...prev, [field]: value }));
  };

  const filtered = useMemo(() => {
    let r = rows;
    const activeChips = Object.entries(chips).filter(([, v]) => v);
    if (activeChips.length) {
      r = r.filter((row) => activeChips.every(([field, value]) => row[field] === value));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((row) => searchFields.some((f) => String(row[f] ?? '').toLowerCase().includes(q)));
    }
    if (sort) {
      const { k, dir } = sort;
      r = [...r].sort((a, b) => {
        let va = a[k], vb = b[k];
        if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        return (va < vb ? -1 : va > vb ? 1 : 0) * (dir === 'asc' ? 1 : -1);
      });
    }
    return r;
  }, [rows, search, chips, sort]);

  const toggleSort = (k) => setSort((s) => ({ k, dir: s && s.k === k && s.dir === 'desc' ? 'asc' : 'desc' }));

  return { search, setSearch, chips, toggleChip, sort, toggleSort, filtered };
}
