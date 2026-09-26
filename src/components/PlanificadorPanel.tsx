import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, CreditCard, Sparkles, X } from "lucide-react";
import type { ResultadoPlanificacionAutomatica } from "../domain/services/automaticPlanningService";
import { useAcademicStore } from "../store/useAcademicStore";
import { DisciplineSelector } from "./DisciplineSelector";
import { FinancialPlanningService } from "../financial/services/FinancialPlanningService";
import { PeriodFinancialCard } from "../financial/components/PeriodFinancialCard";
import { FinancialTotalCard } from "../financial/components/FinancialTotalCard";

export const PlanificadorPanel = () => {
  const {
    cursos,
    tarifario,
    disciplinaActiva,
    panelPlanificadorAbierto,
    setPanelPlanificadorAbierto,
    generarPlanificacionOptima,
  } = useAcademicStore();

  const [metodoPago, setMetodoPago] = useState("sin_descuento");
  const [panelAutomatico, setPanelAutomatico] = useState(false);
  const [confirmarAutomatico, setConfirmarAutomatico] = useState(false);
  const [resultadoAutomatico, setResultadoAutomatico] = useState<ResultadoPlanificacionAutomatica | null>(null);
  const [generandoAutomatico, setGenerandoAutomatico] = useState(false);
  const [pagoUnicoPorPeriodo, setPagoUnicoPorPeriodo] = useState<
    Record<string, boolean>
  >({});

  const metodoPagoActivo = tarifario?.metodosPago?.[metodoPago];

  const descripcionTarifario = useMemo(() => {
    if (!tarifario) return null;
    return [tarifario.sede, tarifario.modalidadEstudio, tarifario.vigencia]
      .filter(Boolean)
      .join(" · ");
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

  if (!panelPlanificadorAbierto) return null;

  return (
    <>
      <button
        type="button"
        className="drawer-backdrop"
        onClick={() => setPanelPlanificadorAbierto(false)}
        aria-label="Cerrar planificador financiero"
      />

      <aside className="budget-drawer open">
        <div className="budget-drawer-head">
          <div>
            <span className="budget-kicker">Simulación financiera</span>
            <button
              type="button"
              className="budget-title-trigger"
              onClick={() => setPanelAutomatico((v) => !v)}
            >
              <Calculator size={18} /> Planificador de matrícula
            </button>
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
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            {metodoPagoActivo?.requiereProntoPago && (
              <small className="budget-config-note">
                El descuento bancario se mantiene donde está configurado y solo
                aplica a ciclos regulares pagados antes del vencimiento.
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
      </aside>

      <aside className={`planning-drawer ${panelAutomatico ? 'open' : ''}`}>
        <div className="planning-drawer-head">
          <div>
            <span className="budget-kicker">Motor algorítmico</span>
            <h2><Sparkles size={18}/> Planificación automática</h2>
          </div>
          <button type="button" className="drawer-close" onClick={() => setPanelAutomatico(false)}><X size={18}/></button>
        </div>
        <p>Genera una ruta académica usando únicamente ciclos regulares. El algoritmo no considera verano para ordenar la malla.</p>
        <button className="planning-generate-btn" onClick={() => setConfirmarAutomatico(true)}>
          <Sparkles size={16}/> Generar planificación
        </button>
        {resultadoAutomatico && <div className="planning-explanation">
          {resultadoAutomatico.explicacion.map((e) => <p key={e}>{e}</p>)}
        </div>}
      </aside>

      {confirmarAutomatico && <div className="planning-confirm-backdrop">
        <div className="planning-confirm-modal">
          <AlertTriangle size={24}/>
          <h2>Se reemplazará tu planificación</h2>
          <p>Al usar esta herramienta perderás la distribución manual de cursos pendientes. Puedes hacer un respaldo antes de continuar.</p>
          <button onClick={async () => { setGenerandoAutomatico(true); const r = await generarPlanificacionOptima(); setResultadoAutomatico(r); setConfirmarAutomatico(false); setGenerandoAutomatico(false); }}>{generandoAutomatico ? 'Generando...' : 'Continuar'}</button>
          <button onClick={() => setConfirmarAutomatico(false)}>Cancelar</button>
        </div>
      </div>}
    </>
  );
};
