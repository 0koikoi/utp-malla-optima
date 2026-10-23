import type { Curso, CursoReferencia, PeriodoAcademico, PeriodoIngreso } from '../../types/academic';
import { JALADO_PERMITE_VERANO } from '../../config/academicLimits';
import {
  crearPeriodoRegular, crearPeriodoVerano, determinarPeriodoEnCurso, obtenerPeriodoCurso,
} from './academicPeriodRules';
import { periodoBloqueadoPorCicloActual, permiteVeranoDespuesDe } from './academicContextRules';

/**
 * Regla UTP de jalados: cada curso jalado tiene una VENTANA de recuperación.
 * Si después del ciclo N viene un verano (calendario UTP), la ventana es
 * [Verano N, Ciclo N+1]; si no, [Ciclo N+1]. El jalado solo puede ir a su
 * ventana o volver a su ciclo original, y mientras no esté en ella bloquea
 * agregar otros cursos desde la ventana en adelante.
 */
export interface ContextoJalados {
  cicloActual?: number | null;
  periodoIngreso?: PeriodoIngreso | null;
  jaladoPermiteVerano?: boolean;
}

const resolverCicloActual = (cursos: Curso[], contexto: ContextoJalados): number | null =>
  contexto.cicloActual ?? determinarPeriodoEnCurso(cursos)?.cicloReferencia ?? null;

export const esCursoJalado = (curso: Curso): boolean => Boolean(curso.jalado) && curso.estado === 'PENDIENTE';

/** Ventana de recuperación de un curso jalado en el ciclo N, en orden cronológico. */
export const ventanaDesdeCiclo = (ciclo: number, contexto: ContextoJalados = {}): PeriodoAcademico[] => {
  // Mismo criterio que decide qué veranos se muestran en la malla; sin mes de ingreso no se asume verano.
  const hayVerano = (contexto.jaladoPermiteVerano ?? JALADO_PERMITE_VERANO) && Boolean(contexto.periodoIngreso) &&
    permiteVeranoDespuesDe(ciclo, contexto.periodoIngreso!);
  return [...(hayVerano ? [crearPeriodoVerano(ciclo)] : []), crearPeriodoRegular(ciclo + 1)];
};

/**
 * Ventana de un jalado. Se jaló en el ciclo N; si esa ventana ya pasó (N
 * anterior al actual) la regla se aplica desde el ciclo actual. Un jalado
 * adelantado (N posterior al actual) se cursó en el periodo actual, así que
 * también parte del ciclo actual. Vacía si no se conoce el ciclo actual.
 */
export const ventanaJalado = (_curso: Curso, cursos: Curso[], contexto: ContextoJalados = {}): PeriodoAcademico[] => {
  const cicloActual = resolverCicloActual(cursos, contexto);
  return cicloActual ? ventanaDesdeCiclo(cicloActual, contexto) : [];
};

/** "Verano 7" o "Ciclo 8". */
export const nombrePeriodoCorto = (periodo: PeriodoAcademico): string =>
  `${periodo.tipo === 'VERANO' ? 'Verano' : 'Ciclo'} ${periodo.cicloReferencia}`;

/** "en el Verano 7 o en el Ciclo 8" / "en el Ciclo 8". */
export const textoVentana = (ventana: PeriodoAcademico[]): string =>
  ventana.length ? `en el ${ventana.map(nombrePeriodoCorto).join(' o en el ')}` : '';

/** Para la etiqueta de la tarjeta: "Verano 7 o Ciclo 8" / "Ciclo 8". */
export const etiquetaVentana = (ventana: PeriodoAcademico[]): string =>
  ventana.map(nombrePeriodoCorto).join(' o ');

/** Lugar original de un jalado: el ciclo donde se jaló o, si es posterior al actual, el banco. */
export const ubicacionOriginalJalado = (curso: Curso, cicloActual: number): PeriodoAcademico | 'banco' => {
  const ciclo = curso.cicloJalado ?? curso.cicloOrigen;
  return ciclo <= cicloActual ? crearPeriodoRegular(ciclo) : 'banco';
};

const estaEnPeriodo = (curso: Curso, periodo: PeriodoAcademico) =>
  curso.ubicacion === 'periodo' && obtenerPeriodoCurso(curso).id === periodo.id;

export const estaEnVentana = (curso: Curso, cursos: Curso[], contexto: ContextoJalados = {}): boolean =>
  ventanaJalado(curso, cursos, contexto).some((periodo) => estaEnPeriodo(curso, periodo));

/** Jalados que todavía no están dentro de su ventana. */
export const jaladosFaltantes = (cursos: Curso[], contexto: ContextoJalados = {}): Curso[] =>
  cursos.filter((curso) => esCursoJalado(curso) && !estaEnVentana(curso, cursos, contexto));

/** Jalados fuera de su ventana cuya ventana incluye `periodo` (para el aviso de la fila). */
export const jaladosFaltantesEn = (periodo: PeriodoAcademico, cursos: Curso[], contexto: ContextoJalados = {}): Curso[] =>
  jaladosFaltantes(cursos, contexto).filter((curso) =>
    ventanaJalado(curso, cursos, contexto).some((item) => item.id === periodo.id));

const listar = (nombres: string[]) =>
  nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres.join('');

/** Jalados agrupados por ventana: [{ nombres: "A y B", ventana: "en el Verano 7 o en el Ciclo 8" }]. */
export const gruposPorVentana = (jalados: Curso[], cursos: Curso[], contexto: ContextoJalados = {}) => {
  const grupos = new Map<string, string[]>();
  for (const jalado of jalados) {
    const ventana = textoVentana(ventanaJalado(jalado, cursos, contexto));
    grupos.set(ventana, [...(grupos.get(ventana) ?? []), jalado.nombre]);
  }
  return [...grupos].map(([ventana, nombres]) => ({ nombres: listar(nombres), ventana }));
};

export const mensajeJaladoObligatorio = (curso: Curso, cursos: Curso[], contexto: ContextoJalados = {}): string =>
  `Un curso jalado debe llevarse ${textoVentana(ventanaJalado(curso, cursos, contexto))}.`;

export const mensajeJaladosPendientes = (faltantes: Curso[], cursos: Curso[], contexto: ContextoJalados = {}): string =>
  gruposPorVentana(faltantes, cursos, contexto)
    .map(({ nombres, ventana }) => `Debes llevar primero ${nombres} ${ventana}.`).join(' ');

/**
 * a) Un jalado solo puede ir a un periodo de su ventana o volver a su lugar
 *    original (su ciclo bloqueado o, si era adelantado, el banco).
 */
export const destinoJaladoPermitido = (
  curso: Curso, destino: PeriodoAcademico | 'banco', cursos: Curso[], contexto: ContextoJalados = {}
): boolean => {
  const cicloActual = resolverCicloActual(cursos, contexto);
  if (!esCursoJalado(curso) || !cicloActual) return true;
  const original = ubicacionOriginalJalado(curso, cicloActual);
  if (destino === 'banco') return original === 'banco';
  if (original !== 'banco' && destino.id === original.id) return true;
  return ventanaJalado(curso, cursos, contexto).some((periodo) => periodo.id === destino.id);
};

export const esRegresoAlOrigen = (
  curso: Curso, destino: PeriodoAcademico | 'banco', cursos: Curso[], contexto: ContextoJalados = {}
): boolean => {
  const cicloActual = resolverCicloActual(cursos, contexto);
  if (!esCursoJalado(curso) || !cicloActual) return false;
  const original = ubicacionOriginalJalado(curso, cicloActual);
  return destino === 'banco' || original === 'banco' ? destino === original : destino.id === original.id;
};

/**
 * Si `jalado` impide agregar otros cursos a `destino`: en un verano de su
 * ventana, salvo que el jalado esté en ese mismo verano; en el ciclo regular de
 * su ventana y en los posteriores, salvo que ya esté dentro de su ventana.
 */
const jaladoBloquea = (jalado: Curso, destino: PeriodoAcademico, cursos: Curso[], contexto: ContextoJalados) => {
  const ventana = ventanaJalado(jalado, cursos, contexto);
  const regular = ventana.at(-1);
  if (!regular) return false;
  if (destino.tipo === 'VERANO' && ventana.some((periodo) => periodo.id === destino.id)) {
    return !estaEnPeriodo(jalado, destino);
  }
  return destino.orden >= regular.orden && !estaEnVentana(jalado, cursos, contexto);
};

/** b) Jalados que impiden agregar `curso` a `destino` (vacío si se permite). */
export const jaladosQueBloquean = (
  curso: Curso, destino: PeriodoAcademico, cursos: Curso[], contexto: ContextoJalados = {}
): Curso[] => {
  if (esCursoJalado(curso)) return [];
  return cursos.filter((jalado) => esCursoJalado(jalado) && jalado.codigo !== curso.codigo &&
    jaladoBloquea(jalado, destino, cursos, contexto));
};

/**
 * c) Un pendiente ya planificado donde algún jalado lo bloquea queda inválido
 *    hasta que ese jalado esté en su ventana.
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

/** Lleva un jalado a su lugar original: su ciclo bloqueado o, si era adelantado, el banco. */
export const devolverJaladoAOrigen = (curso: Curso, cicloActual: number): Curso => {
  const original = ubicacionOriginalJalado(curso, cicloActual);
  return original === 'banco'
    ? { ...curso, ciclo: curso.cicloOrigen, tipoPeriodo: 'REGULAR', ubicacion: 'banco' }
    : { ...curso, ciclo: original.cicloReferencia, tipoPeriodo: 'REGULAR', ubicacion: 'periodo' };
};

/**
 * Al importar (o fijar el ciclo actual), un jalado adelantado (se jaló en un
 * ciclo posterior al actual) que sigue en ese ciclo pasa al banco: también es
 * obligatorio en su ventana y no se cotiza hasta planificarlo.
 */
export const ubicarJaladosAdelantados = (cursos: Curso[], cicloActual: number): Curso[] =>
  cursos.map((curso) => {
    const cicloJalado = curso.cicloJalado ?? curso.cicloOrigen;
    return esCursoJalado(curso) && curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' &&
      cicloJalado > cicloActual && curso.ciclo === cicloJalado
      ? devolverJaladoAOrigen(curso, cicloActual) : curso;
  });
