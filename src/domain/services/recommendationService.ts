import type { Curso } from '../../types/academic';

export interface CursoCritico {
  codigo: string;
  nombre: string;
  desbloquea: number;
  ciclo: number;
}

const construirDependencias = (cursos: Curso[]) => {
  const mapa = new Map<string, string[]>();

  cursos.forEach((curso) => {
    mapa.set(curso.codigo, []);
  });

  cursos.forEach((curso) => {
    curso.prerrequisitos.forEach((req) => {
      const dependientes = mapa.get(req);
      if (dependientes) dependientes.push(curso.codigo);
    });
  });

  return mapa;
};

/**
 * Cuenta todos los descendientes del grafo, no solo dependencias directas.
 * Representa el impacto futuro de retrasar un curso.
 */
export const calcularImpactoFuturo = (
  codigo: string,
  cursos: Curso[]
): number => {
  const grafo = construirDependencias(cursos);
  const visitados = new Set<string>();

  const recorrer = (actual: string) => {
    const siguientes = grafo.get(actual) ?? [];

    siguientes.forEach((siguiente) => {
      if (!visitados.has(siguiente)) {
        visitados.add(siguiente);
        recorrer(siguiente);
      }
    });
  };

  recorrer(codigo);
  return visitados.size;
};

export const calcularRutaCritica = (cursos: Curso[]): CursoCritico[] =>
  cursos
    .filter((curso) => curso.estado === 'PENDIENTE')
    .map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      ciclo: curso.cicloOrigen,
      desbloquea: calcularImpactoFuturo(curso.codigo, cursos),
    }))
    .sort((a, b) => b.desbloquea - a.desbloquea);

export const obtenerCursosPrioritarios = (
  cursos: Curso[],
  limite = 10
): CursoCritico[] => calcularRutaCritica(cursos).slice(0, limite);
