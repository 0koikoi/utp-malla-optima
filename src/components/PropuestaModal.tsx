import { formatCredits } from '../utils/formatCredits';
import { explicarMotivo, explicarPlan } from '../presentation/messages/planningMessages';
import { useLayoutEffect, useRef } from 'react';
import { AlertTriangle, Check, FileText, X } from 'lucide-react';
import { pluralizar } from '../utils/pluralizar';
import type { ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';

interface Props {
  propuesta: ResultadoPlanificacionAutomatica;
  error?: string;
  onClose: () => void;
  onApply: () => void;
}

export function PropuestaModal({ propuesta, error, onClose, onApply }: Props) {
  const modalRef = useRef<HTMLElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();
    return () => {
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true });
    };
  }, []);

  return <>
    <div className="strategy-proposal-backdrop" role="presentation" onMouseDown={onClose} />
    <section ref={modalRef} className="strategy-proposal-modal" role="dialog" aria-modal="true"
      aria-labelledby="proposal-title" onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key !== 'Tab') return;
        const botones = modalRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        const primero = botones?.[0];
        const ultimo = botones?.[botones.length - 1];
        if ((event.shiftKey && document.activeElement === primero) || (!event.shiftKey && document.activeElement === ultimo)) {
          event.preventDefault();
          (event.shiftKey ? ultimo : primero)?.focus();
        }
      }}>
      <header className="strategy-proposal-head">
        <div><span><FileText size={17} aria-hidden="true" /> Planificación automática</span><h2 id="proposal-title">Tu propuesta de planificación</h2></div>
        <button ref={cerrarRef} type="button" className="strategy-proposal-close" onClick={onClose} aria-label="Cerrar propuesta"><X size={21} /></button>
      </header>
      <div className="strategy-proposal-body">
        <p className="strategy-proposal-summary"><b>{propuesta.totalPlanificados}</b> {pluralizar(propuesta.totalPlanificados, 'curso organizado', 'cursos organizados')} en <b>{propuesta.ciclos.length}</b> {pluralizar(propuesta.ciclos.length, 'periodo', 'periodos')}.</p>
        <section className="strategy-proposal-explanation" aria-label="Explicación de la propuesta">
          {propuesta.explicacion.map((linea, index) => <p key={index}>{explicarPlan(linea)}</p>)}
        </section>
        {propuesta.advertenciasHoras.length > 0 && <div className="strategy-proposal-warning"><AlertTriangle size={19} aria-hidden="true" /><div><b>Carga horaria recomendada superada</b>{propuesta.advertenciasHoras.map((aviso) => <p key={aviso.periodo.id}>{aviso.periodo.etiqueta}: {aviso.total} horas; recomendadas: {aviso.limite}. Puedes aplicar la propuesta.</p>)}</div></div>}
        {propuesta.ciclos.length > 0 && <section className="strategy-proposal-cycles" aria-labelledby="proposal-cycles-title">
          <h3 id="proposal-cycles-title">Distribución por ciclo</h3>
          {propuesta.ciclos.map((ciclo) => <div key={ciclo.periodo.id}><h4>{ciclo.periodo.etiqueta}<span>{ciclo.horasEfectivas} h · {formatCredits(ciclo.creditos)} cr</span></h4><ul>{ciclo.cursos.map((curso) => <li key={curso.codigo}>{curso.nombre}</li>)}</ul></div>)}
        </section>}
        {propuesta.noPlanificados.length > 0 && <div className="strategy-proposal-warning"><AlertTriangle size={19} aria-hidden="true" /><div><b>{propuesta.noPlanificados.length} cursos permanecen pendientes</b>{propuesta.noPlanificados.map((curso) => <p key={curso.codigo}><strong>{curso.nombre} ({curso.codigo})</strong>: {curso.motivos.map(explicarMotivo).join(' ')}</p>)}</div></div>}
      </div>
      <footer className="strategy-proposal-footer">
        {error && <p className="strategy-proposal-error" role="alert">{error}</p>}
        <p>Revisa la propuesta antes de aplicarla a tu malla.</p>
        <button type="button" className="strategy-apply-btn" onClick={onApply}><Check size={17} aria-hidden="true" /> Aplicar propuesta</button>
      </footer>
    </section>
  </>;
}
