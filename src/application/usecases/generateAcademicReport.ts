import type { Curso } from '../../types/academic';

/**
 * Datos preparados para un futuro componente PDFReport.
 * Mantiene la generación separada de la interfaz.
 */
export const generateAcademicReportData = (cursos: Curso[]) => ({
  totalCursos: cursos.length,
  creditos: cursos.reduce((sum, curso) => sum + curso.creditos, 0),
  ciclos: cursos.reduce<Record<number, Curso[]>>((acc, curso) => {
    acc[curso.ciclo] ??= [];
    acc[curso.ciclo].push(curso);
    return acc;
  }, {}),
});
