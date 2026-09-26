import { useMemo, useState } from 'react';
import { AlertTriangle, Check, CreditCard, Sparkles, TrendingUp, X } from 'lucide-react';
import type { ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';
import { calcularRutaCritica } from '../domain/services/recommendationService';
import { useAcademicStore } from '../store/useAcademicStore';
import { DisciplineSelector } from './DisciplineSelector';
import { FinancialPlanningService } from '../financial/services/FinancialPlanningService';
import { PeriodFinancialCard } from '../financial/components/PeriodFinancialCard';
import { FinancialTotalCard } from '../financial/components/FinancialTotalCard';

export function PlanificadorPanel() {
  const {
    cursos, tarifario, disciplinaActiva, panelPlanificadorAbierto,
    setPanelPlanificadorAbierto, previsualizarPlanificacionOptima,
    aplicarPlanificacionOptima,
  } = useAcademicStore();
  const [pestana, setPestana] = useState<'academico' | 'financiero'>('academico');
  const [metodoPago, setMetodoPago] = useState('sin_descuento');
  const [pagoUnico, setPagoUnico] = useState<Record<string, boolean>>({});
  const [propuesta, setPropuesta] = useState<ResultadoPlanificacionAutomatica | null>(null);
  const [firmaOrigen, setFirmaOrigen] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState('');
  const criticos = useMemo(() => calcularRutaCritica(cursos).slice(0, 6), [cursos]);
  const creditosPendientes = cursos.filter((curso) => curso.estado === 'PENDIENTE')
    .reduce((suma, curso) => suma + curso.creditos, 0);
  const resumen = useMemo(() => tarifario
    ? FinancialPlanningService.calcular(cursos, tarifario, disciplinaActiva, {
        metodoPago, pagoUnicoPorPeriodo: pagoUnico,
      })
    : null, [cursos, tarifario, disciplinaActiva, metodoPago, pagoUnico]);

  if (!panelPlanificadorAbierto) return null;

  const generar = () => {
    setError('');
    try {
      setPropuesta(previsualizarPlanificacionOptima());
      setFirmaOrigen(JSON.stringify(cursos));
    }
    catch { setError('No se pudo generar la propuesta.'); }
  };
  const aplicar = async () => {
    if (!propuesta) return;
    try {
      if (firmaOrigen !== JSON.stringify(cursos)) throw new Error('La malla cambió. Genera una propuesta nueva.');
      await aplicarPlanificacionOptima(propuesta);
      setPropuesta(null);
      setConfirmar(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo aplicar la propuesta.');
      setConfirmar(false);
    }
  };

  return <>
    <button type="button" className="drawer-backdrop" onClick={() => setPanelPlanificadorAbierto(false)} aria-label="Cerrar estrategia" />
    <aside className="budget-drawer strategy-drawer open" aria-label="Estrategia académica y financiera">
      <div className="budget-drawer-head"><div><span className="budget-kicker">Estrategia de matrícula</span><h2>Plan académico y presupuesto</h2></div>
        <button type="button" className="drawer-close" onClick={() => setPanelPlanificadorAbierto(false)} aria-label="Cerrar"><X size={18} /></button></div>
      <div className="strategy-drawer-tabs" role="tablist" aria-label="Secciones de estrategia">
        <button type="button" role="tab" aria-selected={pestana === 'academico'} onClick={() => setPestana('academico')}><Sparkles size={14} /> Ruta académica</button>
        <button type="button" role="tab" aria-selected={pestana === 'financiero'} onClick={() => setPestana('financiero')}><CreditCard size={14} /> Simulación de cuotas</button>
      </div>
      {pestana === 'academico' ? <div className="strategy-tab-content" role="tabpanel">
        <div className="advisor-ai-card"><span className="advisor-ai-chip"><Sparkles size={12} /> Motor académico</span>
          <h3>Propuesta curricular</h3><p>Prioriza cadenas de prerrequisitos y distribuye cursos pendientes respetando los límites de la malla.</p></div>
        <section className="strategy-block"><h3>Cursos críticos</h3><p>Materias pendientes que desbloquean más cursos posteriores.</p>
          <div className="critical-courses-grid">{criticos.map((curso) => <div className="critical-course-pill" key={curso.codigo}><b>{curso.codigo}</b><span>{curso.nombre}</span><small>Desbloquea {curso.desbloquea}</small></div>)}</div></section>
        <section className="strategy-block"><h3><TrendingUp size={15} /> Planificación automática</h3>
          <button type="button" className="planning-generate-btn" onClick={generar}><Sparkles size={14} /> Generar propuesta</button>
          {propuesta && <div className="strategy-result-box"><p><b>{propuesta.totalPlanificados}</b> cursos organizados en <b>{propuesta.ciclos.length}</b> ciclos.</p>
            {propuesta.explicacion.map((linea, index) => <p key={index}>{linea}</p>)}
            {propuesta.noPlanificados.length > 0 && <div className="strategy-unplaced-alert"><AlertTriangle size={15} /> {propuesta.noPlanificados.length} cursos permanecen pendientes.</div>}
            <button type="button" className="strategy-apply-btn" onClick={() => setConfirmar(true)}><Check size={15} /> Aplicar propuesta</button>
          </div>}</section>
      </div> : <div className="strategy-tab-content" role="tabpanel">
        <div className="budget-control-block"><label htmlFor="disciplina-select">Facultad / tarifario</label><DisciplineSelector />
          {tarifario && <small className="budget-config-note">{[tarifario.sede, tarifario.modalidadEstudio, tarifario.vigencia].filter(Boolean).join(' · ')}</small>}</div>
        {tarifario?.metodosPago && <div className="budget-control-block"><label htmlFor="metodo-pago-select"><CreditCard size={14} /> Método de pago</label>
          <select id="metodo-pago-select" value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
            {Object.entries(tarifario.metodosPago).map(([clave, metodo]) => <option key={clave} value={clave}>{metodo.nombre}{metodo.descuentoPorcentaje ? ` (${metodo.descuentoPorcentaje}%)` : ''}</option>)}
          </select></div>}
        <div className="financial-scroll-panel">{resumen?.periodos.length
          ? resumen.periodos.map((periodo) => <PeriodFinancialCard key={periodo.id} periodo={periodo}
              pagoUnicoActivo={Boolean(pagoUnico[periodo.id])}
              onTogglePagoUnico={() => setPagoUnico((actual) => ({ ...actual, [periodo.id]: !actual[periodo.id] }))} />)
          : <div className="budget-empty">No hay cursos pendientes planificados.</div>}</div>
        {resumen && <FinancialTotalCard total={resumen.totalGeneral} />}
      </div>}
      <div className="strategy-shared-footer"><span>Créditos pendientes: <b>{creditosPendientes}</b></span><span>Inversión estimada: <b>S/ {(resumen?.totalGeneral ?? 0).toFixed(2)}</b></span></div>
      {error && <p className="context-error" role="alert">{error}</p>}
    </aside>
    {confirmar && <div className="context-backdrop"><section className="context-modal planning-confirm-modal" role="dialog" aria-modal="true" aria-label="Confirmar planificación"><div className="context-modal-body"><AlertTriangle size={25} /><h2>Aplicar esta propuesta</h2><p>Se reemplazará la distribución de cursos pendientes futuros. Los cursos aprobados, convalidados, en curso y los bloques cerrados se conservarán.</p><div className="confirm-actions"><button type="button" onClick={() => setConfirmar(false)}>Cancelar</button><button type="button" className="context-save" onClick={() => void aplicar()}>Aplicar propuesta</button></div></div></section></div>}
  </>;
}
