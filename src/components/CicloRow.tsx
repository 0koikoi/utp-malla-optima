import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import type { Curso, TipoPeriodoAcademico } from '../types/academic';
import { CourseCard } from './CourseCard';
import { useAcademicStore } from '../store/useAcademicStore';
import { LockKeyhole, MoveDown, Sun } from 'lucide-react';
import {
  crearPeriodoAcademico,
  determinarPeriodoActual,
  determinarPeriodoEnCurso,
  esPeriodoAnterior,
} from '../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual } from '../domain/rules/academicContextRules';
import {
  calcularHorasEfectivas,
  LIMITE_CREDITOS_VERANO,
} from '../domain/rules/planningRules';
import { FinancialPlanningService } from '../financial/services/FinancialPlanningService';

interface Props {
  numCiclo: number;
  cursos: Curso[];
  tipoPeriodo?: TipoPeriodoAcademico;
  habilitado?: boolean;
}

export const CicloRow = ({ numCiclo, cursos, tipoPeriodo = 'REGULAR', habilitado = true }: Props) => {
  const [isOver, setIsOver] = useState(false);
  const {
    moverCursoAPeriodo,
    cursoAMover,
    cursos: todosLosCursos,
    tarifario,
    disciplinaActiva,
    cicloActual,
  } = useAcademicStore();
  const periodo = crearPeriodoAcademico(tipoPeriodo, numCiclo);
  const periodoActual = determinarPeriodoActual(todosLosCursos);
  const periodoEnCurso = determinarPeriodoEnCurso(todosLosCursos);
  const esPeriodoActual = cicloActual
    ? tipoPeriodo === 'REGULAR' && numCiclo === cicloActual
    : periodoEnCurso?.id === periodo.id;
  const esPeriodoPasado = cicloActual
    ? (tipoPeriodo === 'REGULAR' ? numCiclo < cicloActual : numCiclo < cicloActual)
    : esPeriodoAnterior(periodo, periodoActual);
  const esPeriodoBloqueado = !habilitado || (cicloActual
    ? periodoBloqueadoPorCicloActual(periodo, cicloActual)
    : esPeriodoPasado || esPeriodoActual);
  const esVerano = tipoPeriodo === 'VERANO';

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
  const cursosLlevados = cursos.filter(
    (curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO'
  ).length;
  const cicloCompletado = !esVerano && cursos.length > 0 && cursosLlevados === cursos.length;
  const cicloAdelantado = !esVerano && cursosLlevados > 0 && !cicloCompletado;

  const pensionBasePeriodo = useMemo(() => {
    if (!tarifario) return null;
    const cursosPendientesPeriodo = cursos.filter((curso) => curso.estado === 'PENDIENTE');
    if (cursosPendientesPeriodo.length === 0) return null;

    const resumen = FinancialPlanningService.calcular(cursosPendientesPeriodo, tarifario, disciplinaActiva);
    return resumen.periodos[0]?.resumen.cuotaBase ?? null;
  }, [cursos, tarifario, disciplinaActiva, tipoPeriodo]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    if (esPeriodoBloqueado) return;
    const codigo = event.dataTransfer.getData('text/plain');
    if (codigo) void moverCursoAPeriodo(codigo, periodo);
  };

  return (
    <div
      className={`tier-row ${esVerano ? 'summer-row' : ''} ${esPeriodoPasado ? 'period-past' : ''} ${esPeriodoActual ? 'period-current' : ''} ${!habilitado ? 'period-unavailable' : ''} ${isOver ? 'is-over' : ''}`}
      data-periodo={periodo.id}
    >
      <div
        className={`tier-label ${esVerano ? 'summer-label' : ''} ${esPeriodoActual ? 'ciclo-actual' : cicloCompletado ? 'ciclo-aprobado' : cicloAdelantado ? 'ciclo-adelantado' : ''}`}
      >
        {esVerano ? <Sun size={17} className="summer-icon" /> : <span className="tier-num">{numCiclo}</span>}
        <span className="tier-name">{esVerano ? `Verano ${numCiclo}` : `Ciclo ${numCiclo}`}</span>
        <div className="tier-stats">
          <span className="stat-chip stat-horas">{totalHoras}h {esVerano ? 'ef.' : 'sem.'}</span>
          <span className="stat-chip">{totalCreditos} cr</span>
          {pensionBasePeriodo !== null && (
            <span className="stat-chip stat-price">S/ {pensionBasePeriodo.toFixed(2)}</span>
          )}
          {esVerano && <span className="stat-chip summer-limit">máx. {LIMITE_CREDITOS_VERANO} cr</span>}
        </div>
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
        aria-disabled={esPeriodoBloqueado}
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
