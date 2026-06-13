/* Eletrofrio — dados de exemplo (deterministicos) para telas sem endpoint dedicado ainda */

// seeded RNG so charts are stable across renders
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// build a noisy series around a baseline with optional spikes
export function series(seed, n, base, amp, spikes) {
  const r = mulberry(seed);
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5) * amp;
    v = base + (v - base) * 0.86; // mean reversion
    let val = v;
    if (spikes) for (const s of spikes) {
      const d = Math.abs(i - s.at);
      if (d < s.w) val += s.h * Math.exp(-(d * d) / (s.w * s.w * 0.4));
    }
    out.push(val);
  }
  return out;
}

export function bars(seed, n, base, amp) {
  const r = mulberry(seed);
  return Array.from({ length: n }, () => Math.max(0, base + (r() - 0.4) * amp));
}

export const sites = [
  { id: 'bompreco', name: 'Supermercado BomPreço', ativos: 38, falha: 2 },
  { id: 'friobom', name: 'Rede FrioBom', ativos: 27, falha: 1 },
  { id: 'norte', name: 'Atacadão Norte', ativos: 22, falha: 0 },
  { id: 'central', name: 'Mercado Central', ativos: 31, falha: 1 },
  { id: 'superfrio', name: 'SuperFrio Ltda', ativos: 24, falha: 0 },
];

export const sensorTypes = [
  { id: 'temp_amb', name: 'Temp. Ambiente', unit: '°C', n: 142 },
  { id: 'temp_evap', name: 'Temp. Evaporador', unit: '°C', n: 142 },
  { id: 'umidade', name: 'Umidade', unit: '%', n: 96 },
  { id: 'consumo', name: 'Consumo', unit: 'kW', n: 142 },
  { id: 'pressao', name: 'Pressão', unit: 'bar', n: 88 },
  { id: 'porta', name: 'Abertura Porta', unit: 'x', n: 142 },
];

// small-multiples equipment cards
export const equipments = [
  { name: 'Câmara Fria 03', site: 'BomPreço', val: -17.8, unit: '°C', seed: 11, base: -18, amp: 1.4, status: 'red', delta: +6.2, score: 0.91 },
  { name: 'Compressor Setor B', site: 'Central', val: 4.1, unit: 'bar', seed: 22, base: 4, amp: .6, status: 'amber', delta: -1.4, score: 0.87 },
  { name: 'Balcão Frigorífico 01', site: 'FrioBom', val: -3.2, unit: '°C', seed: 33, base: -3, amp: 1.0, status: 'red', delta: +2.1, score: 0.74 },
  { name: 'Expositor Laticínios', site: 'Norte', val: 5.6, unit: '°C', seed: 44, base: 5, amp: .8, status: 'green', delta: +0.3, score: 0.21 },
  { name: 'Câmara Fria 01', site: 'SuperFrio', val: -19.1, unit: '°C', seed: 55, base: -19, amp: .9, status: 'green', delta: -0.2, score: 0.18 },
  { name: 'Túnel Congelamento', site: 'BomPreço', val: -32.4, unit: '°C', seed: 66, base: -32, amp: 1.1, status: 'green', delta: +0.4, score: 0.12 },
  { name: 'Resfriado Carnes', site: 'Central', val: 1.2, unit: '°C', seed: 77, base: 1, amp: .7, status: 'amber', delta: +1.1, score: 0.63 },
  { name: 'Vitrine Padaria', site: 'Norte', val: 7.8, unit: '°C', seed: 88, base: 8, amp: .6, status: 'green', delta: -0.1, score: 0.09 },
  { name: 'Doca Recebimento', site: 'FrioBom', val: 9.4, unit: '°C', seed: 99, base: 9, amp: 1.3, status: 'green', delta: +0.6, score: 0.31 },
];

export const tipos = ['Falha Real', 'Oscilação Normal', 'Em Análise', 'Falso Positivo'];
export const prioridades = ['Crítica', 'Urgente', 'Alta', 'Normal'];
export const estados = ['Aberto', 'Em andamento', 'Aguardando aprovação', 'Resolvido', 'Fechado'];
export const tecnicos = ['—', 'M. Almeida', 'J. Pereira', 'R. Costa', 'A. Nunes', 'S. Ribeiro', 'C. Lopes'];

const alertNames = [
  ['Supermercado BomPreço', 'Câmara Fria 03'],
  ['Rede FrioBom', 'Balcão Frigorífico 01'],
  ['Atacadão Norte', 'Expositor Laticínios'],
  ['Mercado Central', 'Compressor Setor B'],
  ['SuperFrio Ltda', 'Câmara Fria 01'],
  ['Supermercado BomPreço', 'Túnel Congelamento'],
  ['Mercado Central', 'Resfriado Carnes'],
  ['Atacadão Norte', 'Vitrine Padaria'],
];

const r = mulberry(7);
export const alerts = Array.from({ length: 14 }, (_, i) => {
  const [emp, eq] = alertNames[i % alertNames.length];
  const tp = tipos[Math.floor(r() * 4)];
  const pr = prioridades[Math.floor(r() * 4)];
  const h = 7 + Math.floor(r() * 11), m = Math.floor(r() * 60);
  return {
    id: 1042 - i, emp, eq, tipo: tp, prioridade: pr,
    hora: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'),
    score: (0.4 + r() * 0.58).toFixed(2),
  };
});

// chamados (tickets) for table/report
export const chamados = Array.from({ length: 26 }, (_, i) => {
  const [emp, eq] = alertNames[i % alertNames.length];
  const est = estados[Math.floor(r() * estados.length)];
  const pr = prioridades[Math.floor(r() * prioridades.length)];
  const tec = tecnicos[Math.floor(r() * tecnicos.length)];
  const sla = Math.floor(r() * 130) - 15; // % of SLA consumed offset
  const dias = (r() * 6).toFixed(1);
  return {
    id: 'CH-' + (4821 - i),
    titulo: ['Temperatura fora do set point', 'Quebra de padrão térmico', 'Falha de compressor',
      'Oscilação de consumo elétrico', 'Porta aberta prolongada', 'Pressão anormal no circuito'][Math.floor(r() * 6)],
    emp, eq, prioridade: pr, estado: est, tecnico: tec,
    sla: Math.max(2, Math.min(135, 100 - sla)), abertura: '0' + (1 + Math.floor(r() * 9)) + '/06', dias,
    origem: r() > 0.45 ? 'IA' : 'Manual',
  };
});

export const telemetryMain = series(101, 96, -18, 2.2, [{ at: 60, w: 7, h: 46 }, { at: 71, w: 5, h: -8 }]);
export const telemetrySet = Array.from({ length: 96 }, () => -18);
export const telemetryEvap = series(202, 96, -22, 1.6, [{ at: 60, w: 8, h: 40 }]);
export const histRequests = bars(303, 60, 60, 70);
export const histErrors = bars(404, 60, 6, 14);

// ---------------------------------------------------------------------------
// Camada de dados unificada — usada pelas páginas de Ocorrências, Falhas,
// Empresas/Ativos, Manutenção, etc. Tudo deriva do mesmo array `ativos` para
// que as métricas batam entre as telas (ex: nº de ocorrências == nº de
// ativos com saúde "amber"/"red").
// ---------------------------------------------------------------------------

export const empresas = sites.map((s) => ({ id: s.id, nome: s.name, ativos: s.ativos, falhas: s.falha }));

export const grupos = [
  { id: 'camaras', nome: 'Câmaras Frias', icon: 'snow' },
  { id: 'balcoes', nome: 'Balcões e Expositores', icon: 'building' },
  { id: 'compressores', nome: 'Compressores e Condensadoras', icon: 'gauge' },
  { id: 'salas', nome: 'Salas Técnicas', icon: 'server' },
  { id: 'docas', nome: 'Docas e Recebimento', icon: 'inbox' },
];

const ATIVOS_BASE = [
  { nome: 'Câmara Fria 03', empresa: 'bompreco', grupo: 'camaras', unit: '°C', base: -18, amp: 1.4, status: 'ativo', saude: 'red', score: 0.91 },
  { nome: 'Compressor Setor B', empresa: 'central', grupo: 'compressores', unit: 'bar', base: 4, amp: .6, status: 'ativo', saude: 'amber', score: 0.87 },
  { nome: 'Balcão Frigorífico 01', empresa: 'friobom', grupo: 'balcoes', unit: '°C', base: -3, amp: 1.0, status: 'ativo', saude: 'red', score: 0.74 },
  { nome: 'Expositor Laticínios', empresa: 'norte', grupo: 'balcoes', unit: '°C', base: 5, amp: .8, status: 'ativo', saude: 'green', score: 0.21 },
  { nome: 'Câmara Fria 01', empresa: 'superfrio', grupo: 'camaras', unit: '°C', base: -19, amp: .9, status: 'ativo', saude: 'green', score: 0.18 },
  { nome: 'Túnel Congelamento', empresa: 'bompreco', grupo: 'camaras', unit: '°C', base: -32, amp: 1.1, status: 'ativo', saude: 'green', score: 0.12 },
  { nome: 'Resfriador Carnes', empresa: 'central', grupo: 'balcoes', unit: '°C', base: 1, amp: .7, status: 'ativo', saude: 'amber', score: 0.63 },
  { nome: 'Vitrine Padaria', empresa: 'norte', grupo: 'balcoes', unit: '°C', base: 8, amp: .6, status: 'ativo', saude: 'green', score: 0.09 },
  { nome: 'Doca Recebimento', empresa: 'friobom', grupo: 'docas', unit: '°C', base: 9, amp: 1.3, status: 'ativo', saude: 'green', score: 0.31 },
  { nome: 'Câmara Fria 02', empresa: 'bompreco', grupo: 'camaras', unit: '°C', base: -17, amp: 1.2, status: 'manutencao', saude: 'amber', score: 0.55 },
  { nome: 'Compressor Setor A', empresa: 'bompreco', grupo: 'compressores', unit: 'bar', base: 4.2, amp: .5, status: 'manutencao', saude: 'amber', score: 0.48 },
  { nome: 'Condensadora 02', empresa: 'friobom', grupo: 'compressores', unit: 'bar', base: 5.8, amp: .4, status: 'manutencao', saude: 'red', score: 0.78 },
  { nome: 'Sala de Máquinas 1', empresa: 'central', grupo: 'salas', unit: '°C', base: 29, amp: 1.6, status: 'ativo', saude: 'amber', score: 0.52 },
  { nome: 'Sala de Máquinas 2', empresa: 'superfrio', grupo: 'salas', unit: '°C', base: 27, amp: 1.1, status: 'ativo', saude: 'green', score: 0.14 },
  { nome: 'Balcão Frigorífico 02', empresa: 'norte', grupo: 'balcoes', unit: '°C', base: -2.5, amp: .9, status: 'ativo', saude: 'green', score: 0.22 },
  { nome: 'Expositor Bebidas', empresa: 'central', grupo: 'balcoes', unit: '°C', base: 4, amp: .7, status: 'ativo', saude: 'green', score: 0.17 },
  { nome: 'Câmara Fria 04', empresa: 'friobom', grupo: 'camaras', unit: '°C', base: -18.5, amp: 1.3, status: 'inativo', saude: 'gray', score: 0 },
  { nome: 'Vitrine Frios', empresa: 'superfrio', grupo: 'balcoes', unit: '°C', base: 6, amp: .6, status: 'inativo', saude: 'gray', score: 0 },
  { nome: 'Doca Expedição', empresa: 'bompreco', grupo: 'docas', unit: '°C', base: 10, amp: 1.2, status: 'inativo', saude: 'gray', score: 0 },
  { nome: 'Condensadora 01', empresa: 'central', grupo: 'compressores', unit: 'bar', base: 5.2, amp: .5, status: 'ativo', saude: 'green', score: 0.28 },
  { nome: 'Câmara Fria 05', empresa: 'norte', grupo: 'camaras', unit: '°C', base: -18.2, amp: 1.0, status: 'ativo', saude: 'red', score: 0.82 },
  { nome: 'Sala de Máquinas 3', empresa: 'friobom', grupo: 'salas', unit: '°C', base: 30, amp: 1.4, status: 'manutencao', saude: 'red', score: 0.69 },
  { nome: 'Expositor Hortifruti', empresa: 'superfrio', grupo: 'balcoes', unit: '°C', base: 7, amp: .8, status: 'ativo', saude: 'green', score: 0.11 },
  { nome: 'Doca Recebimento 02', empresa: 'central', grupo: 'docas', unit: '°C', base: 11, amp: 1.1, status: 'ativo', saude: 'amber', score: 0.58 },
];

const empresaNome = (id) => sites.find((s) => s.id === id)?.name || id;
const grupoNome = (id) => grupos.find((g) => g.id === id)?.nome || id;
const STATUS_DOT = { ativo: 'green', manutencao: 'amber', inativo: 'gray' };

export const ativos = ATIVOS_BASE.map((a, i) => {
  const seed = 100 + i * 11;
  const rr = mulberry(seed + 5);
  const val = a.base + (rr() - 0.5) * a.amp * 1.4;
  return {
    id: 5000 + i,
    nome: a.nome,
    empresaId: a.empresa,
    empresa: empresaNome(a.empresa),
    grupoId: a.grupo,
    grupo: grupoNome(a.grupo),
    unit: a.unit,
    base: a.base,
    amp: a.amp,
    val: Math.round(val * 10) / 10,
    status: a.status,
    saude: a.saude,
    statusDot: a.saude === 'gray' ? 'gray' : STATUS_DOT[a.status] === 'green' ? a.saude : STATUS_DOT[a.status],
    score: a.score,
    seed,
    ultimaLeitura: a.status === 'inativo' ? '—' : String(6 + Math.floor(rr() * 14)).padStart(2, '0') + ':' + String(Math.floor(rr() * 60)).padStart(2, '0'),
  };
});

export const ativosAtivos = ativos.filter((a) => a.status === 'ativo');
export const inativos = ativos.filter((a) => a.status === 'inativo');
export const emManutencao = ativos.filter((a) => a.status === 'manutencao');

export const gruposComContagem = grupos.map((g) => ({
  ...g,
  total: ativos.filter((a) => a.grupoId === g.id).length,
  ativos: ativos.filter((a) => a.grupoId === g.id && a.status === 'ativo').length,
  alerta: ativos.filter((a) => a.grupoId === g.id && (a.saude === 'amber' || a.saude === 'red')).length,
}));

// equipamentos com anomalia (score relevante) -> alimenta Ocorrências / Falhas
const ANOM_TIPO = (score) => (score > 0.75 ? 'Falha Real' : score > 0.5 ? 'Em Análise' : score > 0.3 ? 'Oscilação Normal' : 'Falso Positivo');
const ANOM_PRIO = (score) => (score > 0.8 ? 'Crítica' : score > 0.6 ? 'Urgente' : score > 0.4 ? 'Alta' : 'Normal');
const ANOM_DESC = {
  'Câmara Fria 03': 'Temperatura 6.2°C acima do set point há 38min',
  'Compressor Setor B': 'Pressão de descarga oscilando fora da faixa nominal',
  'Balcão Frigorífico 01': 'Quebra de padrão térmico detectada pelo Isolation Forest',
  'Câmara Fria 02': 'Ciclo de degelo prolongado, possível acúmulo de gelo',
  'Compressor Setor A': 'Vibração acima do limiar — possível desgaste de rolamento',
  'Condensadora 02': 'Temperatura de condensação elevada, ventilador possivelmente travado',
  'Sala de Máquinas 1': 'Temperatura ambiente da sala técnica acima de 28°C',
  'Câmara Fria 05': 'Anomalia crítica — porta aberta detectada há mais de 20min',
  'Sala de Máquinas 3': 'Falha intermitente no sensor de temperatura',
  'Resfriador Carnes': 'Consumo elétrico 18% acima da média do grupo',
  'Doca Recebimento 02': 'Temperatura instável durante janela de recebimento',
};

const rOc = mulberry(606);
export const ocorrencias = ativos.filter((a) => a.score >= 0.3).map((a, i) => {
  const tipo = ANOM_TIPO(a.score);
  const h = 6 + Math.floor(rOc() * 15), m = Math.floor(rOc() * 60);
  return {
    id: 'OC-' + (9100 + i),
    ativo: a.nome, empresa: a.empresa, grupo: a.grupo,
    tipo, prioridade: ANOM_PRIO(a.score), score: a.score,
    descricao: ANOM_DESC[a.nome] || 'Padrão de leitura fora do esperado para este equipamento',
    hora: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'),
    status: tipo === 'Falso Positivo' ? 'Descartada' : a.score > 0.75 ? 'Chamado aberto' : 'Em análise',
  };
});

export const falhas = ocorrencias.filter((o) => o.tipo === 'Falha Real').map((o, i) => {
  const dur = (1 + (i % 5) * 0.7).toFixed(1);
  return {
    id: 'FL-' + (7200 + i),
    ativo: o.ativo, empresa: o.empresa, grupo: o.grupo,
    descricao: o.descricao, inicio: o.hora,
    duracao: dur + 'h',
    impacto: 'R$ ' + (180 + i * 65).toLocaleString('pt-BR'),
    prioridade: o.prioridade,
    status: i % 3 === 0 ? 'Resolvida' : 'Em andamento',
  };
});

export const manutencoes = emManutencao.map((a, i) => ({
  id: 'MN-' + (3300 + i),
  ativo: a.nome, empresa: a.empresa, grupo: a.grupo,
  tipo: i % 2 === 0 ? 'Preventiva' : 'Corretiva',
  tecnico: tecnicos[(i % (tecnicos.length - 1)) + 1],
  dataAgendada: '0' + (3 + i) + '/06',
  atraso: a.saude === 'red',
  prioridade: a.saude === 'red' ? 'Urgente' : 'Normal',
}));

// ---------------------------------------------------------------------------
// Permissões / usuários
// ---------------------------------------------------------------------------
export const funcoes = ['Administrador', 'Supervisor', 'Técnico', 'Visualização'];
export const permissoesPorFuncao = {
  Administrador: ['Gestão de usuários', 'Configuração do sistema', 'Conexões e API', 'Relatórios', 'Operação de chamados', 'Telemetria'],
  Supervisor: ['Relatórios', 'Operação de chamados', 'Telemetria', 'Gestão de ativos'],
  Técnico: ['Operação de chamados', 'Telemetria'],
  Visualização: ['Telemetria'],
};
export const usuarios = [
  { nome: 'Eduardo Battistus', email: 'whisky.e0207@gmail.com', funcao: 'Administrador', status: 'Ativo', ultimoAcesso: 'agora' },
  { nome: 'Mariana Almeida', email: 'm.almeida@eletrofrio.com', funcao: 'Supervisor', status: 'Ativo', ultimoAcesso: 'há 12min' },
  { nome: 'João Pereira', email: 'j.pereira@eletrofrio.com', funcao: 'Técnico', status: 'Ativo', ultimoAcesso: 'há 1h' },
  { nome: 'Renata Costa', email: 'r.costa@eletrofrio.com', funcao: 'Técnico', status: 'Ativo', ultimoAcesso: 'há 3h' },
  { nome: 'Antônio Nunes', email: 'a.nunes@eletrofrio.com', funcao: 'Técnico', status: 'Inativo', ultimoAcesso: 'há 6 dias' },
  { nome: 'Sofia Ribeiro', email: 's.ribeiro@eletrofrio.com', funcao: 'Visualização', status: 'Ativo', ultimoAcesso: 'há 2 dias' },
  { nome: 'Carlos Lopes', email: 'c.lopes@eletrofrio.com', funcao: 'Supervisor', status: 'Ativo', ultimoAcesso: 'há 28min' },
];

// ---------------------------------------------------------------------------
// Conexões / integrações / fluxo de mensagens
// ---------------------------------------------------------------------------
export const integracoes = [
  { nome: 'API Galileo (telemetria)', tipo: 'REST API', icon: 'server', status: 'green', detalhe: 'Conectado · 142ms', meta: 'sincroniza a cada 60s' },
  { nome: 'Banco de dados (Postgres)', tipo: 'Database', icon: 'inbox', status: 'green', detalhe: 'Conectado · pool 12/20', meta: 'latência média 4ms' },
  { nome: 'WhatsApp (API Aumbler)', tipo: 'Webhook', icon: 'bell', status: 'amber', detalhe: 'Pendente de configuração', meta: 'aguardando token de produção' },
  { nome: 'Serviço RAG / LlamaIndex', tipo: 'IA', icon: 'sparkles', status: 'green', detalhe: 'Conectado · 7 em fila', meta: 'modelo gpt-4o-mini' },
];

export const fluxoEtapas = [
  { nome: 'Sensores IoT', icon: 'cpu', meta: '142 dispositivos' },
  { nome: 'Ingestão (Galileo API)', icon: 'server', meta: 'POST /pipeline-completo' },
  { nome: 'Isolation Forest', icon: 'gauge', meta: 'score de anomalia' },
  { nome: 'Diagnóstico IA (RAG)', icon: 'sparkles', meta: 'LlamaIndex + manuais' },
  { nome: 'Abertura de chamado', icon: 'file', meta: 'condicional' },
  { nome: 'Notificação (Aumbler)', icon: 'bell', meta: 'WhatsApp' },
];

export const apiEndpoints = [
  { method: 'post', path: '/pipeline-completo/{dispositivo_id}', desc: 'Executa o pipeline preditivo completo para um dispositivo', status: 'green', latencia: '820ms' },
  { method: 'post', path: '/dashboard/acionar-ia', desc: 'Aciona o diagnóstico de IA a partir de um resumo técnico', status: 'green', latencia: '610ms' },
  { method: 'get', path: '/saude', desc: 'Healthcheck do serviço', status: 'green', latencia: '8ms' },
];

export const apiLogs = Array.from({ length: 8 }, (_, i) => {
  const r2 = mulberry(800 + i);
  const ep = apiEndpoints[Math.floor(r2() * apiEndpoints.length)];
  const h = 6 + Math.floor(r2() * 15), m = Math.floor(r2() * 60), s = Math.floor(r2() * 60);
  return {
    id: i, method: ep.method, path: ep.path,
    status: r2() > 0.12 ? 200 : 500,
    hora: [h, m, s].map((v) => String(v).padStart(2, '0')).join(':'),
    duracao: Math.round(40 + r2() * 900) + 'ms',
  };
});

// ---------------------------------------------------------------------------
// Telemetria por janela de tempo — usado pelo seletor 1h / 24h / 7d / 30d
// ---------------------------------------------------------------------------
export function telemetriaPorRange(rangeKey) {
  const cfg = {
    '1h': { n: 12, stepMin: 5, amp: 0.6, spikeAt: 8, label: (i) => {
      const mins = i * 5; return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    } },
    '24h': { n: 96, stepMin: 15, amp: 2.2, spikeAt: 60, label: (i) => {
      const mins = i * 15; return String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    } },
    '7d': { n: 168, stepMin: 60, amp: 3.0, spikeAt: 150, label: (i) => {
      const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dia = Math.floor(i / 24), hora = i % 24;
      return dias[dia % 7] + ' ' + String(hora).padStart(2, '0') + 'h';
    } },
    '30d': { n: 30, stepMin: 1440, amp: 1.8, spikeAt: 26, label: (i) => String(i + 1).padStart(2, '0') + '/06' },
  };
  const c = cfg[rangeKey] || cfg['24h'];
  const temp = series(101, c.n, -18, c.amp, [{ at: c.spikeAt, w: Math.max(2, c.n * 0.07), h: 46 }]);
  const evap = series(202, c.n, -22, c.amp * 0.7, [{ at: c.spikeAt, w: Math.max(2, c.n * 0.08), h: 40 }]);
  const setp = Array.from({ length: c.n }, () => -18);
  const data = temp.map((v, i) => ({ horario: c.label(i), temp: v, evap: evap[i], set: setp[i] }));
  return { data, anomalyIdx: c.spikeAt, setpoint: -18 };
}
