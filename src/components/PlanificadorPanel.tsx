import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  ChevronRight,
  CircleAlert,
  Route,
  Sparkles,
  X,
} from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';
import { DisciplineSelector } from './DisciplineSelector';
import { calcularPresupuesto } from '../utils/budgetEngine';
import type { ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';

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
    generarPlanificacionOptima,
  } = useAcademicStore();

  const [panelRutaAbierto, setPanelRutaAbierto] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPlanificacionAutomatica | null>(null);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);

  const cursosEnPlanificador = cursos.filter((curso) =>
    cursosSeleccionadosParaMatricula.includes(curso.codigo)
  );
  const pendientes = cursos.filter((curso) => curso.estado === 'PENDIENTE');

  const resumen = tarifario
    ? calcularPresupuesto(cursosEnPlanificador, tarifario, disciplinaActiva)
    : null;

  const limiteMaximo = tarifario?.limitesAcademicos?.creditosMaximos;
  const excedeCreditos = Boolean(
    resumen && limiteMaximo && resumen.totalCreditos > limiteMaximo
  );

  const cerrarTodo = () => {
    setMostrarConfirmacion(false);
    setPanelRutaAbierto(false);
    setPanelPlanificadorAbierto(false);
  };

  const confirmarGeneracion = async () => {
    setGenerando(true);
    setErrorGeneracion(null);

    try {
      const nuevoResultado = await generarPlanificacionOptima();
      setResultado(nuevoResultado);
      setMostrarConfirmacion(false);
    } catch (error) {
      setErrorGeneracion(
        error instanceof Error ? error.message : 'No se pudo generar la planificación.'
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      {panelPlanificadorAbierto && (
        <button
          type="button"
          className="drawer-backdrop"
          onClick={cerrarTodo}
          aria-label="Cerrar planificador"
        />
      )}

      <aside className={`budget-drawer ${panelPlanificadorAbierto ? 'open' : ''}`}>
        <div className="budget-drawer-head">
          <div>
            <span className="budget-kicker">Simulación referencial</span>
            <button
              type="button"
              className="budget-title-trigger"
              onClick={() => setPanelRutaAbierto((abierto) => !abierto)}
              aria-expanded={panelRutaAbierto}
            >
              <Calculator size={18} />
              <span>Planificador de matrícula</span>
              <ChevronRight
                size={16}
                className={panelRutaAbierto ? 'route-chevron open' : 'route-chevron'}
              />
            </button>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={cerrarTodo}
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

      <aside
        className={`planning-drawer ${panelPlanificadorAbierto && panelRutaAbierto ? 'open' : ''}`}
        aria-label="Planificación académica automática"
      >
        <div className="planning-drawer-head">
          <div>
            <span className="budget-kicker">Motor algorítmico</span>
            <h2><Route size={18} /> Ruta académica óptima</h2>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={() => setPanelRutaAbierto(false)}
            aria-label="Cerrar ruta académica"
          >
            <X size={18} />
          </button>
        </div>

        <div className="planning-action-block">
          <p>
            Reorganiza todos los cursos pendientes utilizando prerrequisitos, impacto futuro y el límite de créditos disponible.
          </p>
          <button
            type="button"
            className="planning-generate-btn"
            disabled={pendientes.length === 0 || generando}
            onClick={() => setMostrarConfirmacion(true)}
          >
            <Sparkles size={16} />
            {generando ? 'Generando...' : 'Generar planificación'}
          </button>
        </div>

        {errorGeneracion && (
          <div className="planning-inline-error">
            <CircleAlert size={15} /> {errorGeneracion}
          </div>
        )}

        <div className="planning-explanation">
          <div className="planning-section-heading">Explicación de la ruta</div>

          {!resultado ? (
            <p className="planning-placeholder">
              Al generar la planificación aparecerá aquí la explicación de la ruta elegida y cualquier curso que no haya podido ubicarse.
            </p>
          ) : (
            <>
              <div className="planning-result-meta">
                <span><b>{resultado.totalPlanificados}</b> planificados</span>
                <span><b>{resultado.limiteCreditos}</b> cr máx.</span>
                <span><b>C{resultado.cicloInicio}</b> inicio</span>
              </div>

              {resultado.explicacion.map((parrafo, index) => (
                <p key={`${index}-${parrafo}`}>{parrafo}</p>
              ))}

              {resultado.ciclos.length > 0 && (
                <div className="planning-cycle-list">
                  {resultado.ciclos.map((ciclo) => (
                    <div className="planning-cycle-item" key={ciclo.ciclo}>
                      <strong>Ciclo {ciclo.ciclo}</strong>
                      <span>{ciclo.cursos.length} cursos · {ciclo.creditos} cr</span>
                    </div>
                  ))}
                </div>
              )}

              {resultado.noPlanificados.length > 0 && (
                <div className="planning-errors">
                  <div className="planning-errors-title">
                    <AlertTriangle size={14} /> Permanecen en pendientes
                  </div>
                  {resultado.noPlanificados.map((curso) => (
                    <div className="planning-error-item" key={curso.codigo}>
                      <strong>{curso.nombre}</strong>
                      <small>{curso.codigo}</small>
                      <ul>
                        {curso.motivos.map((motivo) => <li key={motivo}>{motivo}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {mostrarConfirmacion && (
        <div className="planning-confirm-backdrop" role="presentation">
          <div className="planning-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="planning-confirm-title">
            <div className="planning-confirm-icon"><AlertTriangle size={24} /></div>
            <span className="planning-confirm-kicker">Confirmar reorganización</span>
            <h2 id="planning-confirm-title">Se reemplazará tu planificación pendiente</h2>
            <p>
              Cualquier distribución manual de cursos <b>pendientes</b> será eliminada y el motor generará una nueva ruta directamente sobre la malla.
            </p>
            <p>
              Los cursos <b>aprobados, convalidados y en curso</b> se conservarán sin cambios. Si deseas guardar tu organización actual, exporta antes un respaldo JSON.
            </p>
            <div className="planning-confirm-actions">
              <button
                type="button"
                className="planning-confirm-cancel"
                onClick={() => setMostrarConfirmacion(false)}
                disabled={generando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="planning-confirm-accept"
                onClick={() => void confirmarGeneracion()}
                disabled={generando}
              >
                <Sparkles size={15} /> {generando ? 'Generando...' : 'Generar planificación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
