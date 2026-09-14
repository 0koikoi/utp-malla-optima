import { validateCourses } from '../../domain/schemas/courseSchema';
import type { Curso } from '../../types/academic';

export function exportCoursesBackup(cursos: Curso[]): Blob {
  const data = JSON.stringify({ version: 1, cursos }, null, 2);
  return new Blob([data], { type: 'application/json' });
}

export async function importCoursesBackup(file: File): Promise<Curso[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  return validateCourses(parsed.cursos);
}
