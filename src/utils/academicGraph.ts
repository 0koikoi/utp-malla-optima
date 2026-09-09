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
 * Calcula cuántas materias dependen directamente de cada curso.
 */
export const calcularRutaCritica = (cursos: Curso[]): Map<string, number> => {
  const impactoMap = new Map<string, number>();

  cursos.forEach((curso) => {
    const dependenciasDirectas = cursos.filter((c) => c.prerrequisitos.includes(curso.codigo));
    impactoMap.set(curso.codigo, dependenciasDirectas.length);
  });

  return impactoMap;
};
