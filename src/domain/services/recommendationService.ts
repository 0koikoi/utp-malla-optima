import type { Curso } from '../../types/academic';

export interface CursoCritico {
  codigo: string;
  nombre: string;
  desbloquea: number;
  ciclo: number;
}

export interface PrioridadPendiente {
  impacto: number;
  longitudCadena: number;
}

/** Los hechos académicos completados no aportan impacto a la carga pendiente. */
export const calcularPrioridadesPendientes = (cursos: Curso[]): Map<string, PrioridadPendiente> => {
  const pendientes = cursos.filter((curso) => curso.estado === 'PENDIENTE');
  const grafo = new Map(pendientes.map((curso) => [curso.codigo, [] as string[]]));
  pendientes.forEach((curso) => {
    curso.prerrequisitos.forEach((requisito) => grafo.get(requisito)?.push(curso.codigo));
  });

  const longitudes = new Map<string, number>();
  const longitudDe = (codigo: string, camino = new Set<string>()): number => {
    if (camino.has(codigo)) return 0;
    const conocida = longitudes.get(codigo);
    if (conocida !== undefined) return conocida;
    const siguienteCamino = new Set([...camino, codigo]);
    const longitud = 1 + Math.max(0, ...(grafo.get(codigo) ?? []).map((dependiente) =>
      longitudDe(dependiente, siguienteCamino)));
    longitudes.set(codigo, longitud);
    return longitud;
  };

  return new Map(pendientes.map((curso) => {
    const visitados = new Set([curso.codigo]);
    const recorrer = (codigo: string) => {
      for (const dependiente of grafo.get(codigo) ?? []) {
        if (visitados.has(dependiente)) continue;
        visitados.add(dependiente);
        recorrer(dependiente);
      }
    };
    recorrer(curso.codigo);
    return [curso.codigo, { impacto: visitados.size - 1, longitudCadena: longitudDe(curso.codigo) }];
  }));
};

export const calcularRutaCritica = (cursos: Curso[]): CursoCritico[] => {
  const obligatorios = cursos.filter((curso) => curso.estado === 'PENDIENTE' && curso.tipo !== 'ELECTIVO');
  const prioridades = calcularPrioridadesPendientes(obligatorios);
  return obligatorios
    .map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      ciclo: curso.cicloOrigen,
      desbloquea: prioridades.get(curso.codigo)?.impacto ?? 0,
    }))
    .sort((a, b) => b.desbloquea - a.desbloquea || a.codigo.localeCompare(b.codigo));
};
