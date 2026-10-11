import { formatCredits } from '../utils/formatCredits';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, CreditCard, FileText, Settings2, Sparkles, TrendingUp, X } from 'lucide-react';
import type { ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';
import { calcularRutaCritica } from '../domain/services/recommendationService';
import { useAcademicStore } from '../store/useAcademicStore';
import { PropuestaModal } from './PropuestaModal';
import { useFinancialPlanning } from '../financial/FinancialPlanningContext';
import { PeriodFinancialCard } from '../financial/components/PeriodFinancialCard';
import { FinancialTotalCard } from '../financial/components/FinancialTotalCard';
import { LIMITE_HORAS_PLANIFICACION } from '../domain/rules/planningRules';

export function PlanificadorPanel() {
  const {
    cursos, tarifario, disciplinaActiva, panelPlanificadorAbierto, totalCiclos, ciclosExcluidos, cicloActual, periodoIngreso,
    setPanelPlanificadorAbierto, previsualizarPlanificacionOptima,
    aplicarPlanificacionOptima,
  } = useAcademicStore();
  const financialPlanning = useFinancialPlanning();
  const [pestana, setPestana] = useState<'academico' | 'financiero'>('academico');
  const [ajustesCuotasAbiertos, setAjustesCuotasAbiertos] = useState(false);
  const [metodoPago, setMetodoPago] = useState('sin_descuento');
  const [pagoUnico, setPagoUnico] = useState<Record<string, boolean>>({});
  const [avisoPago, setAvisoPago] = useState('');
  const [propuesta, setPropuesta] = useState<ResultadoPlanificacionAutomatica | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [firmaOrigen, setFirmaOrigen] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState('');
  const confirmarRef = useRef<HTMLElement>(null);
  const generarRef = useRef<HTMLButtonElement>(null);
  const criticos = useMemo(() => calcularRutaCritica(cursos).slice(0, 6), [cursos]);
  const creditosPendientes = cursos.filter((curso) => curso.estado === 'PENDIENTE')
    .reduce((suma, curso) => suma + curso.creditos, 0);
  const resumen = useMemo(() => tarifario
    ? financialPlanning.calcular(cursos, tarifario, disciplinaActiva, {
        metodoPago, pagoUnicoPorPeriodo: pagoUnico,
      })
    : null, [cursos, tarifario, disciplinaActiva, metodoPago, pagoUnico, financialPlanning]);

  useLayoutEffect(() => {
    if (confirmar) confirmarRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [confirmar]);

  useLayoutEffect(() => {
    if (!avisoPago) return;
    const timer = window.setTimeout(() => setAvisoPago(''), 3500);
    return () => window.clearTimeout(timer);
  }, [avisoPago]);

  useEffect(() => {
    if (!panelPlanificadorAbierto) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflowAnterior; };
  }, [panelPlanificadorAbierto]);

  if (!panelPlanificadorAbierto) return null;

  const cerrarEstrategia = () => {
    setDetalleAbierto(false);
    setConfirmar(false);
    setAvisoPago('');
    setPanelPlanificadorAbierto(false);
  };
  const generar = () => {
    setError('');
    try {
      setPropuesta(previsualizarPlanificacionOptima());
      setFirmaOrigen(JSON.stringify({ cursos, totalCiclos, ciclosExcluidos, cicloActual, periodoIngreso }));
      setDetalleAbierto(true);
    }
    catch { setError('No se pudo generar la propuesta.'); }
  };
  const aplicar = async () => {
    if (!propuesta) return;
    try {
      if (firmaOrigen !== JSON.stringify({ cursos, totalCiclos, ciclosExcluidos, cicloActual, periodoIngreso })) throw new Error('La malla o la configuración cambió. Genera una propuesta nueva.');
      await aplicarPlanificacionOptima(propuesta);
      setPropuesta(null);
      setDetalleAbierto(false);
      setConfirmar(false);
      generarRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo aplicar la propuesta.');
      setConfirmar(false);
      setDetalleAbierto(true);
    }
  };
  const cancelarConfirmacion = () => {
    setConfirmar(false);
    setDetalleAbierto(true);
  };

  return <div className="strategy-layer">
    <button type="button" className="drawer-backdrop" onClick={cerrarEstrategia} aria-label="Cerrar estrategia" />
    <aside className="budget-drawer strategy-drawer open" aria-label="Estrategia académica y financiera">
      <div className="budget-drawer-head"><div><span className="budget-kicker">Estrategia de matrícula</span><h2>Plan académico y presupuesto</h2></div>
        <button type="button" className="drawer-close" onClick={cerrarEstrategia} aria-label="Cerrar"><X size={18} /></button></div>
      <div className="strategy-navigation">
        <div className="strategy-drawer-tabs" role="tablist" aria-label="Secciones de estrategia">
          <button type="button" role="tab" aria-selected={pestana === 'academico'} onClick={() => setPestana('academico')}><Sparkles size={14} /> Ruta académica</button>
          <button type="button" role="tab" aria-selected={pestana === 'financiero'} onClick={() => setPestana('financiero')}><CreditCard size={14} /> Simulación de cuotas</button>
        </div>
        {pestana === 'financiero' && <button type="button" className="quota-settings-toggle"
          aria-label="Configuración de cuotas" title="Mostrar u ocultar configuración de cuotas"
          aria-expanded={ajustesCuotasAbiertos} aria-controls="quota-settings"
          onClick={() => setAjustesCuotasAbiertos((actual) => !actual)}>
          <Settings2 size={20} aria-hidden="true" /><span className="quota-settings-label">Configuración</span><ChevronDown size={14} aria-hidden="true" />
        </button>}
      </div>
      {pestana === 'academico' ? <div className="strategy-tab-content" role="tabpanel">
        <section className="strategy-block strategy-automatic"><h3><TrendingUp size={15} /> Planificación automática</h3>
          <p>Ciclo actual: {cicloActual ?? 'sin configurar'}. La propuesta utiliza ciclos regulares desde {(cicloActual ?? 0) + 1} hasta el {totalCiclos}, con un máximo de {LIMITE_HORAS_PLANIFICACION} horas. Los créditos no limitan la selección.</p>
          <p>Primero se organizan los obligatorios. Al final se añade un solo electivo, elegido por menos horas y después por más créditos.</p>
          {ciclosExcluidos.length > 0 && <p>Ciclos retirados: {ciclosExcluidos.join(', ')}. No se utilizarán en la propuesta.</p>}
          <button ref={generarRef} type="button" className="planning-generate-btn" onClick={generar}><Sparkles size={14} /> Generar propuesta</button>
          {propuesta && <button type="button" className="strategy-review-btn" onClick={() => setDetalleAbierto(true)}><FileText size={16} /> Ver propuesta</button>}
        </section>
        <section className="strategy-block"><h3>Cursos críticos</h3><p>Materias obligatorias pendientes que desbloquean más obligatorios posteriores.</p>
          <div className="critical-courses-grid">{criticos.map((curso) => <div className="critical-course-pill" key={curso.codigo}><b>{curso.codigo}</b><span>{curso.nombre}</span><small>Desbloquea {curso.desbloquea}</small></div>)}</div></section>
      </div> : <div className="strategy-tab-content" role="tabpanel">
        <div id="quota-settings" className="quota-settings" hidden={!ajustesCuotasAbiertos}>
          {tarifario && <small className="budget-config-note">Facultad: {disciplinaActiva} · {[tarifario.sede, tarifario.modalidadEstudio, tarifario.vigencia].filter(Boolean).join(' · ')}</small>}
          {tarifario?.metodosPago && <div className="budget-control-block"><label htmlFor="metodo-pago-select"><CreditCard size={14} /> Método de pago</label>
            <select id="metodo-pago-select" value={metodoPago} onChange={(event) => { setMetodoPago(event.target.value); setAvisoPago('Método de pago aplicado a la simulación.'); }}>
              {Object.entries(tarifario.metodosPago).map(([clave, metodo]) => <option key={clave} value={clave}>{metodo.nombre}{metodo.descuentoPorcentaje ? ` (${metodo.descuentoPorcentaje}%)` : ''}</option>)}
            </select></div>}
        </div>
        <div className="financial-scroll-panel">{resumen?.periodos.length
          ? resumen.periodos.map((periodo) => <PeriodFinancialCard key={periodo.id} periodo={periodo}
              pagoUnicoActivo={Boolean(pagoUnico[periodo.id])}
              onTogglePagoUnico={() => { setPagoUnico((actual) => ({ ...actual, [periodo.id]: !actual[periodo.id] })); setAvisoPago('Cambios aplicados a la simulación.'); }} />)
          : <div className="budget-empty">No hay cursos pendientes planificados.</div>}</div>
        {resumen && <FinancialTotalCard total={resumen.totalGeneral} />}
      </div>}
      <div className="strategy-shared-footer"><span>Créditos pendientes: <b>{formatCredits(creditosPendientes)}</b></span><span>Inversión estimada: <b>S/ {(resumen?.totalGeneral ?? 0).toFixed(2)}</b></span></div>
      {error && !detalleAbierto && <p className="context-error" role="alert">{error}</p>}
    </aside>
    {avisoPago && <div className="nav-feedback-toast toast-exito" role="status">{avisoPago}</div>}
    {detalleAbierto && propuesta && <PropuestaModal propuesta={propuesta} error={error}
      onClose={() => setDetalleAbierto(false)}
      onApply={() => { setDetalleAbierto(false); setConfirmar(true); }} />}
    {confirmar && <div className="context-backdrop planning-confirm-backdrop"><section ref={confirmarRef} className="context-modal planning-confirm-modal" role="dialog" aria-modal="true" aria-label="Confirmar planificación"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); cancelarConfirmacion(); }
        if (event.key === 'Tab') {
          const botones = confirmarRef.current?.querySelectorAll<HTMLButtonElement>('button');
          const primero = botones?.[0];
          const ultimo = botones?.[botones.length - 1];
          if ((event.shiftKey && document.activeElement === primero) || (!event.shiftKey && document.activeElement === ultimo)) {
            event.preventDefault();
            (event.shiftKey ? ultimo : primero)?.focus();
          }
        }
      }}>
      <div className="context-modal-body"><AlertTriangle size={25} /><h2>Aplicar esta propuesta</h2><p>Se reorganizarán los obligatorios pendientes futuros y, si hace falta, un solo electivo al final, en ciclos regulares de hasta {LIMITE_HORAS_PLANIFICACION} horas. Los electivos alternativos quedarán en el banco. Se conservarán los cursos aprobados, los cursos en curso, los bloques cerrados y los veranos manuales válidos de obligatorios con sus prerrequisitos programados.</p><div className="confirm-actions"><button type="button" onClick={cancelarConfirmacion}>Cancelar</button><button type="button" className="context-save" onClick={() => void aplicar()}><Check size={15} /> Aplicar propuesta</button></div></div>
    </section></div>}
  </div>;
}
