import type { Curso } from '../../types/academic';

export const MAXIMO_CICLOS = 18;
export const CICLOS_INICIALES = 10;

export const normalizarTotalCiclos = (total: number): number =>
  Math.max(1, Math.min(MAXIMO_CICLOS, Number.isFinite(total) ? Math.trunc(total) : CICLOS_INICIALES));

/** Conserva los periodos asignados sin ampliar la malla por el ciclo de origen de cursos en el banco. */
export const determinarTotalCiclos = (cursos: Curso[], configurado = 1): number =>
  normalizarTotalCiclos(cursos.reduce(
    (mayor, curso) => curso.ubicacion === 'periodo' ? Math.max(mayor, curso.ciclo || 1) : mayor,
    normalizarTotalCiclos(configurado)
  ));

/** Solo se pueden retirar los ciclos adicionales, del 11 al 18. */
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
