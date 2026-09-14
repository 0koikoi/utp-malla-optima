import type { Curso } from '../../types/academic';

export const cursoBloqueado = (curso: Curso) =>
  curso.estado === 'APROBADO' ||
  curso.estado === 'CONVALIDADO' ||
  curso.estado === 'EN_CURSO';

export const normalizarCurso = (curso: Curso): Curso => {
  const cicloOrigen = curso.cicloOrigen || curso.ciclo || 1;
  return {
    ...curso,
    cicloOrigen,
    ciclo: curso.ciclo || cicloOrigen,
    ubicacion: curso.ubicacion ?? (curso.estado === 'PENDIENTE' ? 'banco' : 'ciclo'),
    prerrequisitos: curso.prerrequisitos ?? [],
  };
};

export const ordenarCursos = (cursos: Curso[]) =>
  [...cursos].sort((a, b) => a.cicloOrigen - b.cicloOrigen || a.nombre.localeCompare(b.nombre, 'es'));
