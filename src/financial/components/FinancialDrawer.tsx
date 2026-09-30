import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  Info,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import type { ResultadoPlanificacionAutomatica } from '@/domain/services/automaticPlanningService';
import { calcularRutaCritica } from '@/domain/services/recommendationService';
import { usePlannerStore } from '@/store/plannerStore';
import { useCursosAcademicArray } from '@/store/selectors';
import { DisciplineSelector } from '@/components/controls/DisciplineSelector';
import { FinancialPlanningService } from '../services/FinancialPlanningService';
import { PeriodFinancialCard } from './PeriodFinancialCard';
import { FinancialTotalCard } from './FinancialTotalCard';

export const FinancialDrawer = () => {
  const cursos = useCursosAcademicArray();
  const {
    tarifario,
    disciplinaActiva,
    panelPlanificadorAbierto,
    setPanelPlanificadorAbierto,
    autoPlanificar,
  } = usePlannerStore();

  const pestanaEstrategia = usePlannerStore((s) => s.pestanaEstrategia);
  const setPestanaEstrategia = usePlannerStore((s) => s.setPestanaEstrategia);

  const [metodoPago, setMetodoPago] = useState('sin_descuento');
  const [confirmarAutomatico, setConfirmarAutomatico] = useState(false);
  const [resultadoAutomatico, setResultadoAutomatico] = useState<ResultadoPlanificacionAutomatica | null>(null);
  const [generandoAutomatico, setGenerandoAutomatico] = useState(false);
  const [pagoUnicoPorPeriodo, setPagoUnicoPorPeriodo] = useState<Record<string, boolean>>({});

  const metodoPagoActivo = tarifario?.metodosPago?.[metodoPago];

  // Top cursos críticos (mayor cantidad de cursos posteriores que desbloquean)
  const cursosCriticos = useMemo(() => {
    return calcularRutaCritica(cursos).slice(0, 6);
  }, [cursos]);

  // Créditos pendientes totales por cursar
  const creditosPendientes = useMemo(() => {
    return cursos
      .filter((c) => c.estado === 'PENDIENTE')
      .reduce((acc, c) => acc + (c.creditos || 0), 0);
  }, [cursos]);

  const descripcionTarifario = useMemo(() => {
    if (!tarifario) return null;
    return [tarifario.sede, tarifario.modalidadEstudio, tarifario.vigencia]
      .filter(Boolean)
      .join(' · ');
  }, [tarifario]);

  const resumen = useMemo(() => {
    if (!tarifario) return null;

    return FinancialPlanningService.calcular(cursos, tarifario, disciplinaActiva, {
      metodoPago,
      pagoUnicoPorPeriodo,
    });
  }, [cursos, tarifario, disciplinaActiva, metodoPago, pagoUnicoPorPeriodo]);

  const alternarPagoUnico = (periodoId: string) => {
    setPagoUnicoPorPeriodo((actual) => ({
      ...actual,
      [periodoId]: !actual[periodoId],
    }));
  };

  const handleGenerarPlan = async () => {
    setGenerandoAutomatico(true);
    try {
      const res = autoPlanificar();
      setResultadoAutomatico(res);
    } finally {
      setGenerandoAutomatico(false);
    }
  };

  const handleAplicarPlanAMalla = () => {
    if (!resultadoAutomatico) return;
    usePlannerStore.getState().aplicarPlanAcademico(resultadoAutomatico.cursos);
    setConfirmarAutomatico(false);
  };

  if (!panelPlanificadorAbierto) return null;

  return (
    <>
      <button
        type="button"
        className="drawer-backdrop"
        onClick={() => setPanelPlanificadorAbierto(false)}
        aria-label="Cerrar panel de estrategia"
      />

      <aside className="budget-drawer strategy-drawer open" aria-label="Estrategia de Matrícula">
        {/* Encabezado del Drawer con Selector de Pestañas (Curricular IA vs Cuotas) */}
        <div className="budget-drawer-head">
          <div className="strategy-head-info">
            <span className="budget-kicker">Estrategia de Matrícula UTP</span>
            <div className="strategy-drawer-tabs" role="tablist" aria-label="Secciones de estrategia">
              <button
                type="button"
                role="tab"
                id="tab-academico"
                aria-selected={pestanaEstrategia === 'academico'}
                aria-controls="panel-tab-academico"
                className={`strategy-tab-btn ${pestanaEstrategia === 'academico' ? 'active' : ''}`}
                onClick={() => setPestanaEstrategia('academico')}
              >
                <Sparkles size={14} className="tab-icon-sparkle" /> Asesor Curricular (IA)
              </button>
              <button
                type="button"
                role="tab"
                id="tab-financiero"
                aria-selected={pestanaEstrategia === 'financiero'}
                aria-controls="panel-tab-financiero"
                className={`strategy-tab-btn ${pestanaEstrategia === 'financiero' ? 'active' : ''}`}
                onClick={() => setPestanaEstrategia('financiero')}
              >
                <CreditCard size={14} /> Simulación de Cuotas
              </button>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={() => setPanelPlanificadorAbierto(false)}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── PESTAÑA 1: ASESOR CURRICULAR (IA) ── */}
        {pestanaEstrategia === 'academico' && (
          <div
            id="panel-tab-academico"
            role="tabpanel"
            aria-labelledby="tab-academico"
            className="strategy-tab-content"
          >
            {/* Tarjeta de Asistente IA (Roadmap hacia IA) */}
            <div className="advisor-ai-card">
              <div className="advisor-ai-header">
                <span className="advisor-ai-chip">
                  <Sparkles size={11} /> Motor Algorítmico & IA
                </span>
                <span className="advisor-status-badge">UTP 2026</span>
              </div>
              <h3 className="advisor-ai-title">Asistente Curricular Inteligente</h3>
              <p className="advisor-ai-desc">
                Analiza las cadenas de prerrequisitos de tu plan de estudios, detecta cursos cuello de botella y calcula una distribución equilibrada respetando los límites de horas y créditos.
              </p>
            </div>

            {/* Diagnóstico de Cursos Críticos */}
            {cursosCriticos.length > 0 && (
              <div className="strategy-block">
                <div className="strategy-block-title">
                  <AlertCircle size={13} className="text-amber" />
                  <span>Cursos Críticos (Mayor Desbloqueo)</span>
                </div>
                <p className="strategy-block-desc">
                  Materias pendientes con mayor cantidad de cursos dependientes aguas abajo:
                </p>
                <div className="critical-courses-grid">
                  {cursosCriticos.map((c) => (
                    <div key={c.codigo} className="critical-course-pill">
                      <span className="critical-course-code">{c.codigo}</span>
                      <span className="critical-course-name" title={c.nombre}>
                        {c.nombre}
                      </span>
                      <span
                        className="critical-course-unlock"
                        title={`Desbloquea ${c.desbloquea} materias en la malla`}
                      >
                        🔓 {c.desbloquea}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generador de Ruta Curricular */}
            <div className="strategy-block">
              <div className="strategy-action-header">
                <div className="strategy-block-title">
                  <TrendingUp size={13} className="text-blue" />
                  <span>Optimización Curricular</span>
                </div>
                <button
                  type="button"
                  className="planning-generate-btn"
                  disabled={generandoAutomatico}
                  onClick={handleGenerarPlan}
                >
                  <Sparkles size={14} />
                  <span>{generandoAutomatico ? 'Calculando ruta...' : 'Generar Propuesta Óptima'}</span>
                </button>
              </div>

              {resultadoAutomatico && (
                <div className="strategy-result-box">
                  <div className="strategy-result-meta-row">
                    <span className="strategy-meta-chip">
                      <CheckCircle2 size={13} className="text-emerald" />
                      <b>{resultadoAutomatico.totalPlanificados}</b> cursos organizados
                    </span>
                    <span className="strategy-meta-chip">
                      <b>{resultadoAutomatico.ciclos.length}</b> ciclos regulares
                    </span>
                  </div>

                  <div className="strategy-explanation-list">
                    {resultadoAutomatico.explicacion.map((exp, idx) => (
                      <div key={idx} className="strategy-explanation-item">
                        <Info size={13} className="explanation-icon" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>

                  {resultadoAutomatico.noPlanificados.length > 0 && (
                    <div className="strategy-unplaced-alert">
                      <AlertTriangle size={14} className="text-amber" />
                      <div>
                        <strong>Cursos no ubicados en ciclos regulares:</strong>
                        {resultadoAutomatico.noPlanificados.map((np) => (
                          <div key={np.codigo} className="unplaced-item">
                            • <em>{np.nombre}</em>: {np.motivos.join(' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="strategy-apply-btn"
                    onClick={() => setConfirmarAutomatico(true)}
                  >
                    <Check size={16} /> Aplicar esta propuesta a mi Malla
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PESTAÑA 2: SIMULACIÓN DE CUOTAS (FINANZAS) ── */}
        {pestanaEstrategia === 'financiero' && (
          <div
            id="panel-tab-financiero"
            role="tabpanel"
            aria-labelledby="tab-financiero"
            className="strategy-tab-content"
          >
            <div className="budget-control-block">
              <label htmlFor="disciplina-select">Facultad / tarifario</label>
              <DisciplineSelector />
              {descripcionTarifario && (
                <small className="budget-config-note">{descripcionTarifario}</small>
              )}
            </div>

            {tarifario?.metodosPago && (
              <div className="budget-control-block">
                <label htmlFor="metodo-pago-select">
                  <CreditCard size={14} /> Pronto pago
                </label>
                <div className="budget-select-control">
                  <CreditCard size={14} />
                  <select
                    id="metodo-pago-select"
                    value={metodoPago}
                    onChange={(event) => setMetodoPago(event.target.value)}
                  >
                    {Object.entries(tarifario.metodosPago).map(([clave, metodo]) => (
                      <option key={clave} value={clave}>
                        {metodo.nombre}
                        {metodo.descuentoPorcentaje > 0
                          ? ` (${metodo.descuentoPorcentaje}%)`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {metodoPagoActivo?.requiereProntoPago && (
                  <small className="budget-config-note">
                    El descuento bancario se mantiene donde está configurado y solo aplica a ciclos regulares pagados antes del vencimiento.
                  </small>
                )}
              </div>
            )}

            <div className="financial-scroll-panel">
              {resumen?.periodos.length ? (
                resumen.periodos.map((periodo) => (
                  <PeriodFinancialCard
                    key={periodo.id}
                    periodo={periodo}
                    pagoUnicoActivo={Boolean(pagoUnicoPorPeriodo[periodo.id])}
                    onTogglePagoUnico={() => alternarPagoUnico(periodo.id)}
                  />
                ))
              ) : (
                <div className="budget-empty">No existen cursos planificados.</div>
              )}
            </div>

            {resumen && <FinancialTotalCard total={resumen.totalGeneral} />}
          </div>
        )}

        {/* ── FOOTER PERSISTENTE COMPARTIDO (VINCULACIÓN CURRICULAR + FINANCIERA) ── */}
        <div className="strategy-shared-footer">
          <div className="footer-kpi-item">
            <span className="footer-kpi-label">Ciclos Restantes</span>
            <span className="footer-kpi-value">{resumen?.periodos.length ?? 0}</span>
          </div>
          <div className="footer-kpi-divider" />
          <div className="footer-kpi-item">
            <span className="footer-kpi-label">Créditos Pendientes</span>
            <span className="footer-kpi-value">{creditosPendientes} crd</span>
          </div>
          <div className="footer-kpi-divider" />
          <div className="footer-kpi-item">
            <span className="footer-kpi-label">Total Inversión Estimada</span>
            <span className="footer-kpi-value highlight">
              {resumen?.totalGeneral !== undefined
                ? `S/ ${resumen.totalGeneral.toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : 'S/ 0.00'}
            </span>
          </div>
        </div>
      </aside>

      {/* Modal de confirmación antes de volcar la propuesta a la malla */}
      {confirmarAutomatico && (
        <div className="planning-confirm-backdrop">
          <div className="planning-confirm-modal">
            <AlertTriangle size={28} className="confirm-icon-warning" />
            <h2>Se reorganizará tu planificación</h2>
            <p>
              Al aplicar esta ruta sugerida por el asistente, los cursos pendientes de tu malla se reubicarán según la secuencia curricular óptima. Puedes descargar un respaldo JSON previamente desde el menú de acciones si deseas conservar tu distribución manual.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-btn-primary"
                onClick={handleAplicarPlanAMalla}
              >
                Continuar y Aplicar
              </button>
              <button
                type="button"
                className="confirm-btn-secondary"
                onClick={() => setConfirmarAutomatico(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
