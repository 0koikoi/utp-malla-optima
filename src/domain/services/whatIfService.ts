import type { Curso } from '../../types/academic';
import { obtenerPeriodoCurso } from '../rules/academicPeriodRules';
import { construirGrafoAcademico } from './prerequisiteService';

export interface SimulacionJalado {
  /** Descendientes transitivos que no podrán llevarse hasta aprobar el curso. */
  cursosBloqueados: { codigo: string; nombre: string; cicloOrigen: number }[];
  /** Descendientes ya planificados que quedarían con la secuencia rota. */
  planificadosInvalidos: { codigo: string; periodoId: string }[];
}

const ESTADOS_CUMPLIDOS = new Set(['APROBADO', 'CONVALIDADO']);

const descendientesTransitivos = (codigo: string, grafo: Map<string, string[]>): Set<string> => {
  const visitados = new Set<string>();
  const pendientes = [...(grafo.get(codigo) ?? [])];
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    if (actual === codigo || visitados.has(actual)) continue;
    visitados.add(actual);
    pendientes.push(...(grafo.get(actual) ?? []));
  }
  return visitados;
};

/**
 * What-if PURO: qué pasaría si el estudiante jala `codigo`. No toca el store.
 * Mientras un jalado siga en su ciclo no cumple como prerrequisito, así que
 * toda la cadena descendiente queda bloqueada y cualquier descendiente ya
 * planificado queda inválido.
 */
export const simularJalado = (codigo: string, cursos: Curso[]): SimulacionJalado => {
  if (!cursos.some((curso) => curso.codigo === codigo)) return { cursosBloqueados: [], planificadosInvalidos: [] };

  const descendientes = descendientesTransitivos(codigo, construirGrafoAcademico(cursos));
  const afectados = cursos
    .filter((curso) => descendientes.has(curso.codigo) && !ESTADOS_CUMPLIDOS.has(curso.estado))
    .sort((a, b) => a.cicloOrigen - b.cicloOrigen || a.codigo.localeCompare(b.codigo));

  return {
    cursosBloqueados: afectados.map(({ codigo, nombre, cicloOrigen }) => ({ codigo, nombre, cicloOrigen })),
    planificadosInvalidos: afectados
      .filter((curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo')
      .sort((a, b) => obtenerPeriodoCurso(a).orden - obtenerPeriodoCurso(b).orden || a.codigo.localeCompare(b.codigo))
      .map((curso) => ({ codigo: curso.codigo, periodoId: obtenerPeriodoCurso(curso).id })),
  };
};
