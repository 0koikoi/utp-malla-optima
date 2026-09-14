import type { Curso, Tarifario } from '../../types/academic';

export interface ImportedBackup {
  cursos: Curso[];
  tarifario: Tarifario | null;
}

export const importAcademicBackup = async (
  file: File
): Promise<ImportedBackup> => {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!Array.isArray(data.cursos)) {
    throw new Error('Archivo de respaldo inválido');
  }

  return {
    cursos: data.cursos,
    tarifario: data.tarifario ?? null,
  };
};
