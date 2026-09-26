import type { Curso, PeriodoAcademico, TipoPeriodoAcademico } from '../../types/academic';
import { crearPeriodoRegular, determinarPeriodoActual, determinarPeriodoEnCurso, esPeriodoAnterior } from './academicPeriodRules';
import { periodoBloqueadoPorCicloActual } from './academicContextRules';

export const LIMITE_HORAS_PERIODO = 26;
export const FACTOR_HORAS_VERANO = 2;
export const LIMITE_CREDITOS_VERANO = 11;
export const MINIMO_CREDITOS_ELECTIVOS = 3;

export interface ResultadoLimite {
  valido: boolean;
  total: number;
  limite: number;
}

export const calcularHorasEfectivas = (
  cursos: Curso[],
  tipoPeriodo: TipoPeriodoAcademico
): number => {
  const horas = cursos.reduce((total, curso) => total + curso.horasSemanales, 0);
  return tipoPeriodo === 'VERANO' ? horas * FACTOR_HORAS_VERANO : horas;
};

/** R2 — máximo recomendado de 22 horas efectivas por periodo. */
export const validarLimiteHorasPeriodo = (
  cursos: Curso[],
  tipoPeriodo: TipoPeriodoAcademico
): ResultadoLimite => {
  const total = calcularHorasEfectivas(cursos, tipoPeriodo);
  return {
    valido: total <= LIMITE_HORAS_PERIODO,
    total,
    limite: LIMITE_HORAS_PERIODO,
  };
};

/** R3 — mínimo global de créditos electivos para completar la carrera. */
export const validarMinimoCreditosElectivos = (cursos: Curso[]): ResultadoLimite => {
  const total = cursos
    .filter((curso) => curso.tipo === 'ELECTIVO')
    .reduce((suma, curso) => suma + curso.creditos, 0);

  return {
    valido: total >= MINIMO_CREDITOS_ELECTIVOS,
    total,
    limite: MINIMO_CREDITOS_ELECTIVOS,
  };
};

/** R4 — máximo 11 créditos por verano. */
export const validarLimiteCreditosVerano = (cursos: Curso[]): ResultadoLimite => {
  const total = cursos.reduce((suma, curso) => suma + curso.creditos, 0);
  return {
    valido: total <= LIMITE_CREDITOS_VERANO,
    total,
    limite: LIMITE_CREDITOS_VERANO,
  };
};

/**
 * Regla de destino temporal.
 * - Si existe un periodo EN_CURSO, no se permiten cursos nuevos ni en periodos
 *   anteriores ni en el propio periodo que el estudiante ya está cursando.
 * - El verano inmediatamente posterior sí está disponible.
 * - Si no existen cursos EN_CURSO, el primer periodo calculado sigue siendo
 *   planificable.
 */
export const validarDestinoNoAnterior = (
  cursos: Curso[],
  destino: PeriodoAcademico,
  cicloActualExplicito?: number | null
): {
  valido: boolean;
  periodoActual: PeriodoAcademico;
  esPeriodoActualBloqueado: boolean;
} => {
  const periodoActual = cicloActualExplicito
    ? crearPeriodoRegular(cicloActualExplicito)
    : determinarPeriodoActual(cursos);
  const periodoEnCurso = determinarPeriodoEnCurso(cursos);
  const esPeriodoActualBloqueado = Boolean(
    (cicloActualExplicito || periodoEnCurso) && destino.orden === periodoActual.orden
  );

  return {
    valido:
      (cicloActualExplicito
        ? !periodoBloqueadoPorCicloActual(destino, cicloActualExplicito)
        : !esPeriodoAnterior(destino, periodoActual) && !esPeriodoActualBloqueado),
    periodoActual,
    esPeriodoActualBloqueado,
  };
};
