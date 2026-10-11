import type { Curso } from '../../../types/academic';

export const tieneDependenciaCircular = (codigo: string, cursos: Map<string, Curso>): boolean => {
  const estado = new Map<string, 'visitando' | 'terminado'>();
  const recorrer = (actual: string): boolean => {
    if (estado.get(actual) === 'visitando') return true;
    if (estado.get(actual) === 'terminado') return false;
    const curso = cursos.get(actual);
    if (!curso || curso.estado !== 'PENDIENTE') return false;
    estado.set(actual, 'visitando');
    if (curso.prerrequisitos.some(recorrer)) return true;
    estado.set(actual, 'terminado');
    return false;
  };
  return recorrer(codigo);
};
