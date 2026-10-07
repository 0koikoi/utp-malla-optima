import type { Curso } from '../../types/academic';

export const MAXIMO_CICLOS = 20;
export const CICLOS_INICIALES = 10;

export const normalizarTotalCiclos = (total: number): number =>
  Math.max(1, Math.min(MAXIMO_CICLOS, Number.isFinite(total) ? Math.trunc(total) : CICLOS_INICIALES));

/** Conserva visibles tanto los ciclos de origen como las asignaciones extendidas. */
export const determinarTotalCiclos = (cursos: Curso[], configurado = 1): number =>
  normalizarTotalCiclos(cursos.reduce(
    (mayor, curso) => Math.max(mayor, curso.cicloOrigen || 1, curso.ciclo || 1),
    normalizarTotalCiclos(configurado)
  ));

/** Solo se pueden retirar los ciclos adicionales, del 11 al 20. */
export const normalizarCiclosExcluidos = (ciclos: readonly number[] = []): number[] =>
  [...new Set(ciclos.filter((ciclo) => Number.isInteger(ciclo) && ciclo > CICLOS_INICIALES && ciclo <= MAXIMO_CICLOS))]
    .sort((a, b) => a - b);

export const obtenerCiclosDisponibles = (total: number, excluidos: readonly number[] = []): number[] => {
  const retirados = new Set(normalizarCiclosExcluidos(excluidos));
  return Array.from({ length: normalizarTotalCiclos(total) }, (_, index) => index + 1)
    .filter((ciclo) => !retirados.has(ciclo));
};

export const obtenerSiguienteCiclo = (total: number, excluidos: readonly number[] = []): number | null =>
  normalizarCiclosExcluidos(excluidos).find((ciclo) => ciclo <= total) ??
  (total < MAXIMO_CICLOS ? total + 1 : null);
