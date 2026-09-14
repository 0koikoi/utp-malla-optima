import type { Curso, Tarifario } from '../../types/academic';

export interface AcademicBackup {
  version: number;
  fecha: string;
  cursos: Curso[];
  tarifario: Tarifario | null;
}

export const exportAcademicBackup = (
  cursos: Curso[],
  tarifario: Tarifario | null
): Blob => {
  const data: AcademicBackup = {
    version: 1,
    fecha: new Date().toISOString(),
    cursos,
    tarifario,
  };

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
};
