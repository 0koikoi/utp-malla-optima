import type { Curso, CursoReferencia } from '../types/academic';

const ESTADOS_CUMPLIDOS = new Set(['APROBADO', 'CONVALIDADO']);

/**
 * Determina si un curso tiene todos sus prerrequisitos aprobados/convalidados.
 * Se usa para el estado visual de las tarjetas del banco.
 */
export const isCursoDesbloqueado = (curso: Curso, todosLosCursos: Curso[]): boolean => {
  if (ESTADOS_CUMPLIDOS.has(curso.estado)) return false;
  if (curso.prerrequisitos.length === 0) return true;

  const cursosAprobados = new Set(
    todosLosCursos
      .filter((c) => ESTADOS_CUMPLIDOS.has(c.estado))
      .map((c) => c.codigo)
  );

  return curso.prerrequisitos.every((req) => cursosAprobados.has(req));
};

/**
 * Valida un movimiento a un ciclo concreto.
 * Un prerrequisito es válido si ya fue aprobado/convalidado o si el estudiante
 * lo planificó en un ciclo estrictamente anterior al destino.
 */
export const validarPrerequisitosParaCiclo = (
  curso: Curso,
  todosLosCursos: Curso[],
  cicloDestino: number
): { valido: boolean; faltantes: CursoReferencia[] } => {
  if (curso.prerrequisitos.length === 0) return { valido: true, faltantes: [] };

  const porCodigo = new Map(todosLosCursos.map((item) => [item.codigo, item]));
  const faltantes: CursoReferencia[] = [];

  for (const codigoPrerequisito of curso.prerrequisitos) {
    const prerequisito = porCodigo.get(codigoPrerequisito);

    // Algunos planes incluyen requisitos externos/nivelación que no aparecen como curso.
    // Al igual que el prototipo UTP, no se bloquea por referencias inexistentes.
    if (!prerequisito) continue;

    if (ESTADOS_CUMPLIDOS.has(prerequisito.estado)) continue;

    const planificadoAntes =
      prerequisito.ubicacion === 'ciclo' && prerequisito.ciclo < cicloDestino;

    if (planificadoAntes) continue;

    faltantes.push({
      codigo: prerequisito.codigo,
      nombre: prerequisito.nombre,
    });
  }

  return { valido: faltantes.length === 0, faltantes };
};

/**
 * Genera una representación del grafo académico.
 * Las claves representan cursos y los valores sus dependientes.
 */
export const construirGrafoAcademico = (cursos: Curso[]): Map<string, string[]> => {
  const grafo = new Map<string, string[]>();

  cursos.forEach((curso) => grafo.set(curso.codigo, []));

  cursos.forEach((curso) => {
    curso.prerrequisitos.forEach((requisito) => {
      grafo.get(requisito)?.push(curso.codigo);
    });
  });

  return grafo;
};

/**
 * Ordenamiento topológico básico para conocer el orden académico posible.
 */
export const obtenerOrdenTopologico = (cursos: Curso[]): string[] => {
  const grafo = construirGrafoAcademico(cursos);
  const grados = new Map<string, number>();

  cursos.forEach((curso) => grados.set(curso.codigo, 0));

  grafo.forEach((dependientes) => {
    dependientes.forEach((dependiente) => {
      grados.set(dependiente, (grados.get(dependiente) ?? 0) + 1);
    });
  });

  const cola = [...grados.entries()]
    .filter(([, grado]) => grado === 0)
    .map(([codigo]) => codigo);

  const resultado: string[] = [];

  while (cola.length) {
    const actual = cola.shift()!;
    resultado.push(actual);

    (grafo.get(actual) ?? []).forEach((siguiente) => {
      grados.set(siguiente, grados.get(siguiente)! - 1);

      if (grados.get(siguiente) === 0) {
        cola.push(siguiente);
      }
    });
  }

  return resultado;
};
