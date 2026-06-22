import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { Topbar, PageHead, Kpi, Pill, Switch, SortTh, Modal } from '../components/ui';
import { useTableFilter } from '../utils/useTableFilter';
import * as D from '../utils/mockData';

const TODAS_PERMISSOES = ['Gestão de usuários', 'Configuração do sistema', 'Conexões e API', 'Relatórios', 'Operação de chamados', 'Telemetria', 'Gestão de ativos'];

export function Permissoes() {
  const [usuarios, setUsuarios] = useState(D.usuarios);
  const { search, setSearch, sort, toggleSort, filtered } = useTableFilter(usuarios, {
    searchFields: ['nome', 'email', 'funcao'],
  });
  const [matriz, setMatriz] = useState(() => {
    const m = {};
    D.funcoes.forEach((f) => { m[f] = new Set(D.permissoesPorFuncao[f]); });
    return m;
  });

  const togglePermissao = (funcao, perm) => {
    setMatriz((prev) => {
      const next = { ...prev, [funcao]: new Set(prev[funcao]) };
      if (next[funcao].has(perm)) next[funcao].delete(perm); else next[funcao].add(perm);
      return next;
    });
  };

  const ativos = usuarios.filter((u) => u.status === 'Ativo').length;
  const [convidar, setConvidar] = useState(false);
  const [nomeConvite, setNomeConvite] = useState('');
  const [emailConvite, setEmailConvite] = useState('');
  const [funcaoConvite, setFuncaoConvite] = useState(D.funcoes[0]);

  const enviarConvite = () => {
    if (!nomeConvite.trim() || !emailConvite.trim()) return;
    setUsuarios((prev) => [
      { nome: nomeConvite, email: emailConvite, funcao: funcaoConvite, status: 'Ativo', ultimoAcesso: 'convite enviado' },
      ...prev,
    ]);
    setNomeConvite('');
    setEmailConvite('');
    setConvidar(false);
  };

  return (
    <>
      <Topbar crumbs={['Eletrofrio', 'Gestão', 'Funções / Permissões']}>
        <div className="field sm" style={{ height: 30 }}>
          <Icon name="search" size={14} />
          <input placeholder="Procurar usuário…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180 }} />
        </div>
        <button className="btn primary" onClick={() => setConvidar(true)}><Icon name="plus" />Convidar usuário</button>
      </Topbar>
      <div className="scroll"><div className="page">
        <PageHead title="Funções / Permissões" sub={`${usuarios.length} usuários · ${D.funcoes.length} funções`} />

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <Kpi icon="users" label="Usuários" value={usuarios.length} />
          <Kpi icon="check" label="Ativos" value={ativos} accent="--green" />
          <Kpi icon="shield" label="Funções" value={D.funcoes.length} />
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Usuários</h3><span className="sub">{filtered.length} de {usuarios.length}</span></div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <SortTh k="nome" label="Nome" sort={sort} onSort={toggleSort} />
                <SortTh k="email" label="E-mail" sort={sort} onSort={toggleSort} />
                <SortTh k="funcao" label="Função" sort={sort} onSort={toggleSort} />
                <th className="c">Status</th>
                <SortTh k="ultimoAcesso" label="Último acesso" sort={sort} onSort={toggleSort} className="r" />
              </tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.email}>
                    <td className="cellmain">{u.nome}</td>
                    <td className="muted">{u.email}</td>
                    <td>{u.funcao}</td>
                    <td className="c"><Pill kind={u.status === 'Ativo' ? 'green' : 'gray'} dot>{u.status}</Pill></td>
                    <td className="r num faint">{u.ultimoAcesso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>Matriz de permissões</h3><span className="sub">por função</span></div>
          <div className="card-b flush" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th>Permissão</th>
                {D.funcoes.map((f) => <th key={f} className="c">{f}</th>)}
              </tr></thead>
              <tbody>
                {TODAS_PERMISSOES.map((perm) => (
                  <tr key={perm}>
                    <td className="cellmain">{perm}</td>
                    {D.funcoes.map((f) => (
                      <td key={f} className="c">
                        <Switch on={matriz[f]?.has(perm)} onClick={() => togglePermissao(f, perm)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>

      <Modal open={convidar} onClose={() => setConvidar(false)} title="Convidar usuário" sub="Envio de convite por e-mail"
        footer={<>
          <button className="btn ghost sm" onClick={() => setConvidar(false)}>Cancelar</button>
          <button className="btn primary sm" disabled={!nomeConvite.trim() || !emailConvite.trim()} onClick={enviarConvite}><Icon name="plus" size={13} />Enviar convite</button>
        </>}>
        <div className="form-row"><label className="lbl">Nome</label>
          <input className="inp" placeholder="Nome completo" value={nomeConvite} onChange={(e) => setNomeConvite(e.target.value)} /></div>
        <div className="form-row"><label className="lbl">E-mail</label>
          <input className="inp" type="email" placeholder="nome@empresa.com" value={emailConvite} onChange={(e) => setEmailConvite(e.target.value)} /></div>
        <div className="form-row"><label className="lbl">Função</label>
          <select className="inp" value={funcaoConvite} onChange={(e) => setFuncaoConvite(e.target.value)}>
            {D.funcoes.map((f) => <option key={f}>{f}</option>)}
          </select></div>
      </Modal>
    </>
  );
}
