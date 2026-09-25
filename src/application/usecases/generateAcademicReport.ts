import type { Curso } from '../../types/academic';
import { obtenerPeriodoCurso } from '../../domain/rules/academicPeriodRules';

/** Datos preparados para el componente PDFReport. */
export const generateAcademicReportData = (cursos: Curso[]) => ({
  totalCursos: cursos.length,
  creditos: cursos.reduce((sum, curso) => sum + curso.creditos, 0),
  periodos: cursos.reduce<Record<string, Curso[]>>((acc, curso) => {
    const periodo = obtenerPeriodoCurso(curso);
    const lista = acc[periodo.id] ?? [];
    lista.push(curso);
    acc[periodo.id] = lista;
    return acc;
  }, {}),
});
