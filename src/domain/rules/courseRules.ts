import type { Curso } from '../../types/academic';
import { obtenerPeriodoCurso } from './academicPeriodRules';
import { periodoBloqueadoPorCicloActual } from './academicContextRules';

export const cursoBloqueado = (curso: Curso) =>
  curso.estado === 'APROBADO' ||
  curso.estado === 'CONVALIDADO' ||
  curso.estado === 'EN_CURSO';

/**
 * Un jalado sigue sin replanificar mientras esté en su lugar original: un
 * periodo bloqueado (su ciclo) o el banco (si era adelantado). Sin ciclo
 * actual conocido se usa su ciclo de malla.
 */
export const esJaladoSinReplanificar = (curso: Curso, cicloActual?: number | null): boolean =>
  Boolean(curso.jalado) && curso.estado === 'PENDIENTE' && (curso.ubicacion === 'banco' ||
  (cicloActual
    ? periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual)
    : curso.tipoPeriodo === 'REGULAR' && curso.ciclo === curso.cicloOrigen));

export const normalizarCurso = (curso: Curso): Curso => {
  const cicloOrigen = curso.cicloOrigen || curso.ciclo || 1;
  const ubicacionPersistida = curso.ubicacion as string | undefined;
  const ubicacion =
    ubicacionPersistida === 'ciclo'
      ? 'periodo'
      : ubicacionPersistida ?? (curso.estado === 'PENDIENTE' && !curso.jalado ? 'banco' : 'periodo');

  return {
    ...curso,
    cicloOrigen,
    ciclo: curso.ciclo || cicloOrigen,
    tipoPeriodo: curso.tipoPeriodo ?? 'REGULAR',
    ubicacion: ubicacion as Curso['ubicacion'],
    prerrequisitos: curso.prerrequisitos ?? [],
  };
};

export const ordenarCursos = (cursos: Curso[]) =>
  [...cursos].sort((a, b) =>
    a.cicloOrigen - b.cicloOrigen || a.nombre.localeCompare(b.nombre, 'es')
  );
