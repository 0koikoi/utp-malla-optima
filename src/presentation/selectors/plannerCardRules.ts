import type { Curso, PeriodoIngreso } from '../../types/academic';
import { permiteVeranoDespuesDe, periodoBloqueadoPorCicloActual } from '../../domain/rules/academicContextRules';
import { obtenerPeriodoCurso } from '../../domain/rules/academicPeriodRules';
import { esJaladoSinReplanificar } from '../../domain/rules/courseRules';

interface SummerVisibility {
  ciclo: number;
  cicloActual: number | null;
  periodoIngreso: PeriodoIngreso | null;
  mostrarVeranos: boolean;
  cicloExcluido: boolean;
  tieneCursos: boolean;
}

export const mostrarFilaVerano = ({
  ciclo, cicloActual, periodoIngreso, mostrarVeranos, cicloExcluido, tieneCursos,
}: SummerVisibility): boolean =>
  mostrarVeranos && cicloActual !== null && ciclo >= cicloActual && periodoIngreso !== null &&
  (!cicloExcluido || tieneCursos) &&
  (permiteVeranoDespuesDe(ciclo, periodoIngreso) || tieneCursos);

export const puedeRetirarCursoRapido = (curso: Curso, cicloActual: number | null): boolean =>
  cicloActual !== null && curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo' &&
  !periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual);

/** Texto de un prerrequisito en la tarjeta; los que no existen en la malla son de nivelación. */
export const etiquetaPrerrequisito = (codigo: string, cursos: Curso[]): string => {
  const requisito = cursos.find((item) => item.codigo === codigo);
  return requisito ? `${codigo} · ${requisito.nombre}` : `${codigo} (nivelación / fuera de la malla)`;
};

/**
 * Resumen informativo de un ciclo ya pasado: horas y créditos de lo llevado
 * (aprobado, convalidado o jalado en ese ciclo). No se cotiza ni genera avisos.
 */
export const resumenCicloPasado = (cursos: Curso[], cicloActual: number | null) => {
  const llevados = cursos.filter((curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO' ||
    esJaladoSinReplanificar(curso, cicloActual));
  return {
    horas: llevados.reduce((suma, curso) => suma + curso.horasSemanales, 0),
    creditos: llevados.reduce((suma, curso) => suma + curso.creditos, 0),
    creditosJalados: llevados.filter((curso) => curso.jalado).reduce((suma, curso) => suma + curso.creditos, 0),
  };
};
