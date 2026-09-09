import { AlertTriangle, BookOpen, Calculator, X } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';
import { DisciplineSelector } from './DisciplineSelector';
import { calcularPresupuesto } from '../utils/budgetEngine';

const formatoMoneda = (moneda: string, monto: number) => {
  if (moneda === 'PEN') return `S/ ${monto.toFixed(2)}`;
  return `${moneda} ${monto.toFixed(2)}`;
};

export const PlanificadorPanel = () => {
  const {
    cursos,
    cursosSeleccionadosParaMatricula,
    toggleSeleccionMatricula,
    tarifario,
    disciplinaActiva,
    panelPlanificadorAbierto,
    setPanelPlanificadorAbierto,
  } = useAcademicStore();

  const cursosEnPlanificador = cursos.filter((curso) =>
    cursosSeleccionadosParaMatricula.includes(curso.codigo)
  );

  const resumen = tarifario
    ? calcularPresupuesto(cursosEnPlanificador, tarifario, disciplinaActiva)
    : null;

  const limiteMaximo = tarifario?.limitesAcademicos?.creditosMaximos;
  const excedeCreditos = Boolean(
    resumen && limiteMaximo && resumen.totalCreditos > limiteMaximo
  );

  return (
    <>
      {panelPlanificadorAbierto && (
        <button
          type="button"
          className="drawer-backdrop"
          onClick={() => setPanelPlanificadorAbierto(false)}
          aria-label="Cerrar planificador"
        />
      )}

      <aside className={`budget-drawer ${panelPlanificadorAbierto ? 'open' : ''}`}>
        <div className="budget-drawer-head">
          <div>
            <span className="budget-kicker">Simulación referencial</span>
            <h2><Calculator size={18} /> Planificador de matrícula</h2>
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
          <label htmlFor="disciplina-select">Tarifario por disciplina</label>
          <DisciplineSelector />
        </div>

        <div className="budget-section-title">
          <BookOpen size={15} /> Materias seleccionadas
          <span>{cursosEnPlanificador.length}</span>
        </div>

        <div className="budget-course-list">
          {cursosEnPlanificador.length === 0 ? (
            <div className="budget-empty">
              Usa el icono de calculadora de una tarjeta para añadir cursos a esta simulación.
            </div>
          ) : (
            cursosEnPlanificador.map((curso) => (
              <div className="budget-course" key={curso.codigo}>
                <div>
                  <strong>{curso.nombre}</strong>
                  <small>{curso.codigo} · {curso.creditos} cr · {curso.horasSemanales} h</small>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSeleccionMatricula(curso.codigo)}
                  aria-label={`Quitar ${curso.nombre}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {excedeCreditos && (
          <div className="budget-warning">
            <AlertTriangle size={15} />
            La selección supera el máximo configurado de {limiteMaximo} créditos.
          </div>
        )}

        {resumen && tarifario && (
          <div className="budget-summary">
            <div><span>Carga</span><b>{resumen.totalCreditos} cr · {resumen.totalHorasSemanales} h</b></div>
            <div><span>Matrícula</span><b>{formatoMoneda(tarifario.moneda, resumen.costoMatricula)}</b></div>
            <div><span>Cuota estimada</span><b className="accent-value">{formatoMoneda(tarifario.moneda, resumen.montoPorCuota)}</b></div>
            <div className="budget-total"><span>Total ciclo</span><b>{formatoMoneda(tarifario.moneda, resumen.costoTotalCiclo)}</b></div>
          </div>
        )}
      </aside>
    </>
  );
};
