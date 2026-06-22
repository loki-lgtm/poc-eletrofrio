import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

// Card com contagem regressiva até o próximo ciclo do scheduler de monitoramento
// em background. Resincroniza com o servidor periodicamente (RESYNC_MS) e conta
// os segundos localmente entre uma sincronização e outra, pra não martelar o backend.
const RESYNC_MS = 15000;

export function AgendaTimerCard() {
  const [agenda, setAgenda] = useState(null);
  const [erroConsulta, setErroConsulta] = useState(null);
  const [agora, setAgora] = useState(Date.now());

  useEffect(() => {
    const buscar = () => {
      fetch('http://localhost:8000/monitoramento/agenda')
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Falha ao consultar /monitoramento/agenda.'))))
        .then((d) => { setAgenda(d); setErroConsulta(null); })
        .catch((e) => setErroConsulta(e.message));
    };
    buscar();
    const resync = setInterval(buscar, RESYNC_MS);

    // aba em segundo plano joga setInterval no limbo — ao voltar o foco,
    // resincroniza com o servidor e atualiza o relógio na hora.
    const aoFocar = () => { if (document.visibilityState === 'visible') { setAgora(Date.now()); buscar(); } };
    document.addEventListener('visibilitychange', aoFocar);

    return () => { clearInterval(resync); document.removeEventListener('visibilitychange', aoFocar); };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const proximaMs = agenda?.proxima_execucao ? new Date(agenda.proxima_execucao).getTime() : null;
  const restanteSeg = proximaMs != null ? Math.max(0, Math.round((proximaMs - agora) / 1000)) : null;
  const mm = restanteSeg != null ? String(Math.floor(restanteSeg / 60)).padStart(2, '0') : '--';
  const ss = restanteSeg != null ? String(restanteSeg % 60).padStart(2, '0') : '--';

  const temErro = !!(erroConsulta || agenda?.ultimo_erro);
  const cor = temErro ? 'red' : agenda?.scheduler_ativo ? 'green' : 'gray';

  return (
    <div className="card">
      <div className="card-h">
        <h3>Próxima varredura automática</h3>
        <span className={'pill ' + cor} style={{ marginLeft: 'auto' }}>
          <span className="dot" />{temErro ? 'Erro' : agenda?.scheduler_ativo ? 'OK' : 'Desligado'}
        </span>
      </div>
      <div className="card-b">
        {!agenda && !erroConsulta && <span className="faint" style={{ fontStyle: 'italic' }}>Consultando agenda…</span>}

        {agenda?.scheduler_ativo && (
          <>
            <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: temErro ? 'var(--red)' : 'var(--cyan)' }}>
              {mm}:{ss}
            </div>
            <span className="faint" style={{ fontSize: 11.5 }}>até a próxima varredura · ciclo a cada {agenda.intervalo_minutos} min</span>
          </>
        )}

        {agenda && !agenda.scheduler_ativo && (
          <span className="faint" style={{ fontStyle: 'italic' }}>Scheduler desligado (MONITORAMENTO_ATIVO=false no .env).</span>
        )}

        {temErro && (
          <div className="row" style={{ gap: 6, marginTop: 10, color: 'var(--red)', fontSize: 12.5 }}>
            <Icon name="alert" size={13} /> {erroConsulta || agenda.ultimo_erro}
          </div>
        )}

        {agenda?.ultimo_fim && !temErro && (
          <div className="faint mono" style={{ fontSize: 10.5, marginTop: 8 }}>
            último ciclo: {agenda.dispositivos_avaliados} dispositivo(s) às {new Date(agenda.ultimo_fim).toLocaleTimeString('pt-BR')}
          </div>
        )}
      </div>
    </div>
  );
}
