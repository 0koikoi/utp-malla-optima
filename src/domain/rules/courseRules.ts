import type { Curso } from '../../types/academic';

export const cursoBloqueado = (curso: Curso) =>
  curso.estado === 'APROBADO' ||
  curso.estado === 'CONVALIDADO' ||
  curso.estado === 'EN_CURSO';

export const normalizarCurso = (curso: Curso): Curso => {
  const cicloOrigen = curso.cicloOrigen || curso.ciclo || 1;
  const ubicacionPersistida = curso.ubicacion as string | undefined;
  const ubicacion =
    ubicacionPersistida === 'ciclo'
      ? 'periodo'
      : ubicacionPersistida ?? (curso.estado === 'PENDIENTE' ? 'banco' : 'periodo');

  return {
    ...curso,
    cicloOrigen,
    ciclo: curso.ciclo || cicloOrigen,
    tipoPeriodo: curso.tipoPeriodo ?? 'REGULAR',
    ubicacion: ubicacion as Curso['ubicacion'],
    prerrequisitos: curso.prerrequisitos ?? [],
  };
};

export const ordenarCursos = (cursos: Curso[]) =>
  [...cursos].sort((a, b) =>
    a.cicloOrigen - b.cicloOrigen || a.nombre.localeCompare(b.nombre, 'es')
  );
