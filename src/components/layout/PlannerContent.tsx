import { Fragment } from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { permiteVeranoDespuesDe } from '../../domain/rules/academicContextRules';
import { determinarPeriodoActual, determinarPeriodoEnCurso } from '../../domain/rules/academicPeriodRules';
import { mostrarFilaVerano } from '../../presentation/selectors/plannerCardRules';
import type { AppController } from '../../hooks/useAppController';
import { BancoPendientes } from '../BancoPendientes';
import { CicloRow } from '../CicloRow';
import { FileUpload } from '../FileUpLoad';

export function PlannerContent({ app }: { app: AppController }) {
  const periodoActualOrden = determinarPeriodoActual(app.cursos).orden;
  const periodoEnCursoId = determinarPeriodoEnCurso(app.cursos)?.id;
  return <main id="app-main">
    <BancoPendientes cursosPendientes={app.pendientesBanco} />
    <section id="panel-planificador" aria-label="Planificador por ciclos">
      {app.sinMalla ? <EmptyPlanner /> : <>
        <div className="planner-heading"><div><span className="planner-section-title">Planificación regular y verano</span><h1>Malla proyectada</h1>
          <p>Los ciclos regulares hasta el actual están bloqueados. Puedes planificar en el verano del ciclo actual si te corresponde, o en periodos futuros.</p></div></div>
        <div id="malla-container">
          {app.ciclos.map((numero) => {
            const cursosVerano = app.cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'VERANO' && curso.ciclo === numero);
            const cicloExcluido = app.ciclosExcluidos.includes(numero);
            return <Fragment key={numero}>
              {!cicloExcluido && <CicloRow numCiclo={numero} cursos={app.cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === numero)} periodoActualOrden={periodoActualOrden} periodoEnCursoId={periodoEnCursoId} />}
              {mostrarFilaVerano({ ciclo: numero, cicloActual: app.cicloActual, periodoIngreso: app.periodoIngreso,
                mostrarVeranos: app.mostrarVeranos, cicloExcluido, tieneCursos: cursosVerano.length > 0 }) && app.periodoIngreso &&
                <CicloRow numCiclo={numero} tipoPeriodo="VERANO" cursos={cursosVerano} habilitado={permiteVeranoDespuesDe(numero, app.periodoIngreso)} periodoActualOrden={periodoActualOrden} periodoEnCursoId={periodoEnCursoId} />}
            </Fragment>;
          })}
          {app.siguienteCiclo !== null && <button type="button" className="add-cycle-btn" onClick={() => void app.agregarCiclo()}><Plus size={15} /> Añadir ciclo {app.siguienteCiclo}</button>}
        </div>
      </>}
    </section>
  </main>;
}

function EmptyPlanner() {
  return <div className="empty-planner">
    <span className="empty-planner-icon"><FileSpreadsheet size={27} /></span>
    <h1>Tu malla comienza aquí</h1>
    <p>Sube tu plan de estudios en Excel para ver tus cursos y organizar los próximos ciclos.</p>
    <FileUpload />
  </div>;
}
