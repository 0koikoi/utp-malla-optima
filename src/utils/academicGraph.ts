import type { Curso } from '../types/academic';

/**
 * Determina si un curso tiene todos sus prerrequisitos cubiertos
 */
export const isCursoDesbloqueado = (curso: Curso, todosLosCursos: Curso[]): boolean => {
  if (curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO') return false;
  if (curso.prerrequisitos.length === 0) return true;

  const cursosAprobados = new Set(
    todosLosCursos
      .filter((c) => c.estado === 'APROBADO' || c.estado === 'CONVALIDADO')
      .map((c) => c.codigo)
  );

  return curso.prerrequisitos.every((req) => cursosAprobados.has(req));
};

/**
 * Calcula el peso/impacto de un curso (cuántas materias desbloquea directa o indirectamente)
 */
export const calcularRutaCritica = (cursos: Curso[]): Map<string, number> => {
  const impactoMap = new Map<string, number>();

  cursos.forEach((curso) => {
    let dependenciasDirectas = cursos.filter((c) => c.prerrequisitos.includes(curso.codigo));
    impactoMap.set(curso.codigo, dependenciasDirectas.length);
  });

  return impactoMap;
};