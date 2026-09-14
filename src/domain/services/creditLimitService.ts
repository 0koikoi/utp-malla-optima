import type { Curso, Tarifario } from '../../types/academic';

export const superaLimiteCreditos = (
  cursos: Curso[],
  tarifario: Tarifario
): boolean => {
  const limite = tarifario.limitesAcademicos?.creditosMaximos;

  if (!limite) return false;

  return cursos.reduce((total, curso) => total + curso.creditos, 0) > limite;
};
