import type { Curso } from '../../types/academic';

export function validateCourses(cursos: Curso[]): Curso[] {
  if (!Array.isArray(cursos)) {
    throw new Error('La malla curricular debe ser un arreglo de cursos.');
  }

  return cursos.map((curso) => {
    if (!curso.codigo || !curso.nombre) {
      throw new Error('Existe un curso sin código o nombre.');
    }

    if (!curso.ciclo || curso.ciclo < 1) {
      throw new Error(`Ciclo inválido en ${curso.codigo}`);
    }

    return {
      ...curso,
      prerrequisitos: curso.prerrequisitos ?? [],
      estado: curso.estado ?? 'PENDIENTE',
    };
  });
}
