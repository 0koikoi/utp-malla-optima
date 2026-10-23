import type { Curso } from '../../types/academic';
import { normalizarCurso } from '../rules/courseRules';
import { MAXIMO_CICLOS } from '../rules/cycleRules';

export function validateCourses(cursos: Curso[]): Curso[] {
  if (!Array.isArray(cursos)) {
    throw new Error('La malla curricular debe ser un arreglo de cursos.');
  }

  return cursos.map((curso) => {
    if (!curso.codigo || !curso.nombre) {
      throw new Error('Existe un curso sin código o nombre.');
    }

    if (!Number.isInteger(curso.ciclo) || curso.ciclo < 1 || curso.ciclo > MAXIMO_CICLOS ||
        (curso.cicloOrigen !== undefined && (!Number.isInteger(curso.cicloOrigen) || curso.cicloOrigen < 1 || curso.cicloOrigen > MAXIMO_CICLOS))) {
      throw new Error(`Ciclo inválido en ${curso.codigo}`);
    }

    return normalizarCurso({
      ...curso,
      prerrequisitos: curso.prerrequisitos ?? [],
      estado: curso.estado ?? 'PENDIENTE',
    });
  });
}
