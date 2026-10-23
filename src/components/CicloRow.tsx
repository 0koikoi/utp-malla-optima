import { formatCredits } from '../utils/formatCredits';
import { memo, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import type { Curso, TipoPeriodoAcademico } from '../types/academic';
import { CourseCard } from './CourseCard';
import { useAcademicStore } from '../store/useAcademicStore';
import { AlertTriangle, LockKeyhole, MoveDown, Sun, X } from 'lucide-react';
import { CICLOS_INICIALES } from '../domain/rules/cycleRules';
import {
  crearPeriodoAcademico,
} from '../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual } from '../domain/rules/academicContextRules';
import {
  calcularHorasEfectivas,
  LIMITE_CREDITOS_VERANO,
  LIMITE_HORAS_PERIODO,
  mensajeRecargoHoras,
  obtenerHorasSinRecargo,
} from '../domain/rules/planningRules';
import { useFinancialPlanning } from '../financial/FinancialPlanningContext';
import { resumenCicloPasado } from '../presentation/selectors/plannerCardRules';

interface Props {
  numCiclo: number;
  cursos: Curso[];
  tipoPeriodo?: TipoPeriodoAcademico;
  habilitado?: boolean;
  periodoActualOrden: number;
  periodoEnCursoId?: string;
}

const CicloRowBase = ({ numCiclo, cursos, tipoPeriodo = 'REGULAR', habilitado = true, periodoActualOrden, periodoEnCursoId }: Props) => {
  const [isOver, setIsOver] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const moverCursoAPeriodo = useAcademicStore((state) => state.moverCursoAPeriodo);
  const cursoAMover = useAcademicStore((state) => state.cursoAMover);
  const tarifario = useAcademicStore((state) => state.tarifario);
  const disciplinaActiva = useAcademicStore((state) => state.disciplinaActiva);
  const cicloActual = useAcademicStore((state) => state.cicloActual);
  const eliminarCiclo = useAcademicStore((state) => state.eliminarCiclo);
  const financialPlanning = useFinancialPlanning();
  const periodo = useMemo(() => crearPeriodoAcademico(tipoPeriodo, numCiclo), [tipoPeriodo, numCiclo]);
  const esPeriodoActual = cicloActual
    ? tipoPeriodo === 'REGULAR' && numCiclo === cicloActual
    : periodoEnCursoId === periodo.id;
  const esPeriodoPasado = cicloActual
    ? (tipoPeriodo === 'REGULAR' ? numCiclo < cicloActual : numCiclo < cicloActual)
    : periodo.orden < periodoActualOrden;
  const esPeriodoBloqueado = !habilitado || (cicloActual
    ? periodoBloqueadoPorCicloActual(periodo, cicloActual)
    : esPeriodoPasado || esPeriodoActual);
  const esVerano = tipoPeriodo === 'VERANO';
  const esCicloAdicional = !esVerano && numCiclo > CICLOS_INICIALES;
  const puedeEliminarse = !esPeriodoBloqueado && cursos.every((curso) => curso.estado === 'PENDIENTE');

  const retirarCiclo = async () => {
    setEliminando(true);
    setErrorEliminar('');
    try {
      if (!await eliminarCiclo(numCiclo)) setErrorEliminar('Este ciclo no se puede retirar.');
    } catch {
      setErrorEliminar('No se pudo retirar el ciclo. Inténtalo de nuevo.');
    } finally {
      setEliminando(false);
    }
  };

  const cursosOrdenados = [...cursos].sort((a, b) => {
    const aLlevado = a.estado === 'APROBADO' || a.estado === 'CONVALIDADO' ? 0 : 1;
    const bLlevado = b.estado === 'APROBADO' || b.estado === 'CONVALIDADO' ? 0 : 1;
    if (aLlevado !== bLlevado) return aLlevado - bLlevado;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  const cursosParaCarga = cursos.filter(
    (curso) => curso.estado === 'PENDIENTE' || curso.estado === 'EN_CURSO'
  );
  const totalCreditos = cursosParaCarga.reduce((acc, curso) => acc + curso.creditos, 0);
  const totalHoras = calcularHorasEfectivas(cursosParaCarga, tipoPeriodo);
  // Los ciclos pasados solo informan lo llevado: sin cotización ni avisos de carga.
  const resumenPasado = esPeriodoPasado && !esVerano ? resumenCicloPasado(cursos, cicloActual) : null;
  const excesoHoras = !resumenPasado && totalHoras > LIMITE_HORAS_PERIODO;
  const horasSinRecargo = obtenerHorasSinRecargo(tarifario, disciplinaActiva);
  const conRecargo = horasSinRecargo !== null && totalHoras > horasSinRecargo;
  const cursosLlevados = cursos.filter(
    (curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO'
  ).length;
  const cicloCompletado = !esVerano && cursos.length > 0 && cursosLlevados === cursos.length;
  const cicloAdelantado = !esVerano && cursosLlevados > 0 && !cicloCompletado;

  const pensionBasePeriodo = useMemo(() => {
    if (!tarifario) return null;
    const cursosPendientesPeriodo = cursos.filter((curso) => curso.estado === 'PENDIENTE');
    if (cursosPendientesPeriodo.length === 0) return null;

    const resumen = financialPlanning.calcular(cursosPendientesPeriodo, tarifario, disciplinaActiva, { cicloActual });
    return resumen.periodos[0]?.resumen.cuotaBase ?? null;
  }, [cursos, tarifario, disciplinaActiva, financialPlanning, cicloActual]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    if (esPeriodoBloqueado) return;
    const codigo = event.dataTransfer.getData('text/plain');
    if (codigo) void moverCursoAPeriodo(codigo, periodo);
  };

  return (
    <div
      className={`tier-row ${esCicloAdicional ? 'removable-cycle' : ''} ${esVerano ? 'summer-row' : ''} ${esPeriodoPasado ? 'period-past' : ''} ${esPeriodoActual ? 'period-current' : ''} ${!habilitado ? 'period-unavailable' : ''} ${isOver ? 'is-over' : ''}`}
      data-periodo={periodo.id}
    >
      {esCicloAdicional && <button type="button" className="remove-cycle-btn"
        disabled={!puedeEliminarse || eliminando} onClick={() => void retirarCiclo()}
        aria-label={`Eliminar ciclo ${numCiclo}`}
        title={puedeEliminarse ? `Eliminar ciclo ${numCiclo}; sus pendientes vuelven al banco` : 'No se puede eliminar un ciclo aprobado, actual o con cursos fijos'}>
        <X size={14} aria-hidden="true" />
      </button>}
      <div
        className={`tier-label ${esVerano ? 'summer-label' : ''} ${esPeriodoActual ? 'ciclo-actual' : cicloCompletado ? 'ciclo-aprobado' : cicloAdelantado ? 'ciclo-adelantado' : ''}`}
      >
        {esVerano ? <Sun size={17} className="summer-icon" /> : <span className="tier-num">{numCiclo}</span>}
        <span className="tier-name">{esVerano ? `Verano ${numCiclo}` : `Ciclo ${numCiclo}`}</span>
        {resumenPasado ? <div className="tier-stats">
          <span className="stat-chip stat-horas">{resumenPasado.horas}h sem.</span>
          <span className="stat-chip">{formatCredits(resumenPasado.creditos)} cr llevados</span>
          {resumenPasado.creditosJalados > 0 && <span className="stat-chip stat-jalados">{formatCredits(resumenPasado.creditosJalados)} cr jalados</span>}
        </div> : <div className="tier-stats">
          <span className={`stat-chip stat-horas ${excesoHoras ? 'stat-hours-warning' : ''}`}>{totalHoras}h {esVerano ? 'ef.' : 'sem.'}</span>
          <span className="stat-chip">{formatCredits(totalCreditos)} cr</span>
          {pensionBasePeriodo !== null && (
            <span className="stat-chip stat-price">S/ {pensionBasePeriodo.toFixed(2)}</span>
          )}
          {esVerano && <span className="stat-chip summer-limit">máx. {LIMITE_CREDITOS_VERANO} cr</span>}
        </div>}
        {excesoHoras && <span className="tier-hours-warning" title={`La carga supera las ${LIMITE_HORAS_PERIODO} horas recomendadas; se permite planificar.`}><AlertTriangle size={11} /> Más de {LIMITE_HORAS_PERIODO} h</span>}
        {conRecargo && <span className="tier-hours-warning tier-surcharge-warning" title="Las horas superan el último rango de pensión del tarifario; cada hora adicional tiene recargo."><AlertTriangle size={11} /> {mensajeRecargoHoras(horasSinRecargo)}</span>}
        {!habilitado ? (
          <span className="tier-lock-note"><LockKeyhole size={10} /> verano no habilitado</span>
        ) : esPeriodoPasado ? (
          <span className="tier-lock-note"><LockKeyhole size={10} /> periodo pasado</span>
        ) : esPeriodoActual ? (
          <span className="tier-lock-note"><LockKeyhole size={10} /> ciclo actual</span>
        ) : cursosLlevados > 0 ? (
          <span className="tier-lock-note">
            <LockKeyhole size={10} /> {cursosLlevados} fijo{cursosLlevados === 1 ? '' : 's'}
          </span>
        ) : null}
        {errorEliminar && <span className="cycle-remove-error" role="alert">{errorEliminar}</span>}
      </div>

      <div
        className="tier-dropzone"
        onDragOver={(event) => {
          if (esPeriodoBloqueado) return;
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
        data-periodo-bloqueado={esPeriodoBloqueado}
      >
        {cursoAMover && !esPeriodoBloqueado && (
          <button
            type="button"
            className="tap-move-target"
            onClick={() => void moverCursoAPeriodo(cursoAMover, periodo)}
          >
            <MoveDown size={14} /> Mover aquí
          </button>
        )}

        {cursosOrdenados.length === 0 ? (
          <div className="tier-empty">
            {esPeriodoPasado
              ? 'Periodo anterior: no admite nuevos cursos'
              : esPeriodoActual
                ? 'Ciclo actual: la matrícula en curso se conserva sin cambios'
                : esVerano
                ? 'Planifica aquí cursos para este verano'
                : 'Arrastra aquí un curso pendiente'}
          </div>
        ) : (
          cursosOrdenados.map((curso) => <CourseCard key={curso.codigo} curso={curso} />)
        )}
      </div>
    </div>
  );
};

export const CicloRow = memo(CicloRowBase, (actual, siguiente) =>
  actual.numCiclo === siguiente.numCiclo &&
  (actual.tipoPeriodo ?? 'REGULAR') === (siguiente.tipoPeriodo ?? 'REGULAR') &&
  (actual.habilitado ?? true) === (siguiente.habilitado ?? true) &&
  actual.periodoActualOrden === siguiente.periodoActualOrden &&
  actual.periodoEnCursoId === siguiente.periodoEnCursoId &&
  actual.cursos.length === siguiente.cursos.length &&
  actual.cursos.every((curso, index) => curso === siguiente.cursos[index])
);
