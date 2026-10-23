import type { Curso, CursoReferencia, PeriodoAcademico, PeriodoIngreso } from '../../types/academic';
import { JALADO_PERMITE_VERANO } from '../../config/academicLimits';
import {
  crearPeriodoRegular, crearPeriodoVerano, determinarPeriodoEnCurso, obtenerPeriodoCurso,
} from './academicPeriodRules';
import { periodoBloqueadoPorCicloActual, permiteVeranoDespuesDe } from './academicContextRules';

/**
 * Regla UTP de jalados: un curso jalado es obligatorio en el periodo de
 * recuperación (el siguiente ciclo regular; también el verano del ciclo
 * actual si jaladoPermiteVerano). Mientras falte alguno allí, no se puede
 * agregar otro curso a ese periodo ni a los posteriores.
 */
export interface ContextoJalados {
  cicloActual?: number | null;
  periodoIngreso?: PeriodoIngreso | null;
  jaladoPermiteVerano?: boolean;
}

const resolverCicloActual = (cursos: Curso[], contexto: ContextoJalados): number | null =>
  contexto.cicloActual ?? determinarPeriodoEnCurso(cursos)?.cicloReferencia ?? null;

export const esCursoJalado = (curso: Curso): boolean => Boolean(curso.jalado) && curso.estado === 'PENDIENTE';

/** Periodos de recuperación válidos, en orden cronológico. Vacío si no se conoce el ciclo actual. */
export const periodosRecuperacion = (cursos: Curso[], contexto: ContextoJalados = {}): PeriodoAcademico[] => {
  const cicloActual = resolverCicloActual(cursos, contexto);
  if (!cicloActual) return [];
  const permiteVerano = (contexto.jaladoPermiteVerano ?? JALADO_PERMITE_VERANO) &&
    (!contexto.periodoIngreso || permiteVeranoDespuesDe(cicloActual, contexto.periodoIngreso));
  return [...(permiteVerano ? [crearPeriodoVerano(cicloActual)] : []), crearPeriodoRegular(cicloActual + 1)];
};

/** El periodo de recuperación regular (Ciclo N); es el que nombran los mensajes. */
export const periodoRecuperacion = (cursos: Curso[], contexto: ContextoJalados = {}): PeriodoAcademico | null =>
  periodosRecuperacion(cursos, contexto).at(-1) ?? null;

/** Lugar original de un jalado: el ciclo donde se jaló o, si es posterior al actual, el banco. */
export const ubicacionOriginalJalado = (curso: Curso, cicloActual: number): PeriodoAcademico | 'banco' => {
  const ciclo = curso.cicloJalado ?? curso.cicloOrigen;
  return ciclo <= cicloActual ? crearPeriodoRegular(ciclo) : 'banco';
};

export const estaEnRecuperacion = (curso: Curso, cursos: Curso[], contexto: ContextoJalados = {}): boolean =>
  curso.ubicacion === 'periodo' &&
  periodosRecuperacion(cursos, contexto).some((periodo) => periodo.id === obtenerPeriodoCurso(curso).id);

/** Jalados que todavía no están en un periodo de recuperación. */
export const jaladosFaltantes = (cursos: Curso[], contexto: ContextoJalados = {}): Curso[] =>
  cursos.filter((curso) => esCursoJalado(curso) && !estaEnRecuperacion(curso, cursos, contexto));

const nombres = (cursos: Curso[]) => cursos.map((curso) => curso.nombre).join(', ');

export const mensajeJaladoObligatorio = (cursos: Curso[], contexto: ContextoJalados = {}): string => {
  const periodos = periodosRecuperacion(cursos, contexto);
  const regular = periodos.at(-1);
  const verano = periodos.length > 1 ? ` o en el ${periodos[0].etiqueta.toLowerCase()}` : '';
  return `Un curso jalado debe llevarse en el Ciclo ${regular?.cicloReferencia ?? '?'}${verano}.`;
};

export const mensajeJaladosPendientes = (faltantes: Curso[], cursos: Curso[], contexto: ContextoJalados = {}): string =>
  `Primero agrega tus cursos jalados al Ciclo ${periodoRecuperacion(cursos, contexto)?.cicloReferencia ?? '?'}: ${nombres(faltantes)}.`;

/**
 * a) Un jalado solo puede ir a su periodo de recuperación o volver a su lugar
 *    original (su ciclo bloqueado o, si era adelantado, el banco).
 */
export const destinoJaladoPermitido = (
  curso: Curso, destino: PeriodoAcademico | 'banco', cursos: Curso[], contexto: ContextoJalados = {}
): boolean => {
  const cicloActual = resolverCicloActual(cursos, contexto);
  if (!esCursoJalado(curso) || !cicloActual) return true;
  const original = ubicacionOriginalJalado(curso, cicloActual);
  if (destino === 'banco' || original === 'banco') return destino === original;
  return destino.id === original.id ||
    periodosRecuperacion(cursos, contexto).some((periodo) => periodo.id === destino.id);
};

export const esRegresoAlOrigen = (
  curso: Curso, destino: PeriodoAcademico | 'banco', cursos: Curso[], contexto: ContextoJalados = {}
): boolean => {
  const cicloActual = resolverCicloActual(cursos, contexto);
  if (!esCursoJalado(curso) || !cicloActual) return false;
  const original = ubicacionOriginalJalado(curso, cicloActual);
  return destino === 'banco' || original === 'banco' ? destino === original : destino.id === original.id;
};

/** b) Jalados que impiden agregar `curso` a `destino` (vacío si se permite). */
export const jaladosQueBloquean = (
  curso: Curso, destino: PeriodoAcademico, cursos: Curso[], contexto: ContextoJalados = {}
): Curso[] => {
  if (esCursoJalado(curso)) return [];
  const inicio = periodosRecuperacion(cursos, contexto)[0];
  if (!inicio || destino.orden < inicio.orden) return [];
  return jaladosFaltantes(cursos, contexto).filter((item) => item.codigo !== curso.codigo);
};

/**
 * c) Un pendiente ya planificado desde el periodo de recuperación en adelante
 *    queda inválido mientras falte algún jalado allí.
 */
export const faltaJaladoParaPlanificado = (curso: Curso, cursos: Curso[], contexto: ContextoJalados = {}): boolean => {
  if (curso.estado !== 'PENDIENTE' || curso.ubicacion !== 'periodo' || esCursoJalado(curso)) return false;
  const cicloActual = resolverCicloActual(cursos, contexto);
  const periodo = obtenerPeriodoCurso(curso);
  if (cicloActual && periodoBloqueadoPorCicloActual(periodo, cicloActual)) return false;
  return jaladosQueBloquean(curso, periodo, cursos, contexto).length > 0;
};

export const planificadosSinJalado = (cursos: Curso[], contexto: ContextoJalados = {}): CursoReferencia[] =>
  cursos.filter((curso) => faltaJaladoParaPlanificado(curso, cursos, contexto))
    .map(({ codigo, nombre }) => ({ codigo, nombre }));
