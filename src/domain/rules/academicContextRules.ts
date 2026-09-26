import type { Curso, PeriodoAcademico, PeriodoIngreso } from '../../types/academic';

export const permiteVeranoDespuesDe = (ciclo: number, ingreso: PeriodoIngreso): boolean =>
  ciclo >= 1 && (ingreso === 'marzo' ? ciclo % 2 === 0 : ciclo % 2 === 1);

export const periodoBloqueadoPorCicloActual = (
  periodo: PeriodoAcademico,
  cicloActual: number
): boolean =>
  periodo.tipo === 'REGULAR'
    ? periodo.cicloReferencia <= cicloActual
    : periodo.cicloReferencia < cicloActual;

/** Reubica hechos académicos importados; conserva el ciclo de origen de la malla. */
export const ubicarAvanceEnCicloActual = (cursos: Curso[], cicloActual: number, ingreso?: PeriodoIngreso | null): Curso[] =>
  cursos.map((curso) => {
    if (curso.estado === 'PENDIENTE' && curso.tipoPeriodo === 'VERANO' && ingreso &&
        !permiteVeranoDespuesDe(curso.ciclo, ingreso)) {
      return { ...curso, ciclo: curso.cicloOrigen, tipoPeriodo: 'REGULAR' as const, ubicacion: 'banco' as const };
    }
    if (curso.estado === 'EN_CURSO') {
      return { ...curso, ciclo: cicloActual, tipoPeriodo: 'REGULAR' as const, ubicacion: 'periodo' as const };
    }
    if (curso.estado === 'APROBADO' && curso.cicloOrigen > cicloActual) {
      return {
        ...curso,
        ciclo: Math.max(1, cicloActual - 1),
        tipoPeriodo: 'REGULAR' as const,
        ubicacion: 'periodo' as const,
      };
    }
    if (curso.estado === 'APROBADO') {
      return { ...curso, ciclo: curso.cicloOrigen, tipoPeriodo: 'REGULAR' as const, ubicacion: 'periodo' as const };
    }
    return curso;
  });
