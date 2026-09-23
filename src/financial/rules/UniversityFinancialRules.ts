import type { Curso, Tarifario, ResumenFinanciero } from '../../types/academic';

export interface UniversityFinancialRules {
  calcular(cursos: Curso[], tarifario: Tarifario, disciplina: string, opciones?: {
    metodoPago?: string;
    pagoUnico?: boolean;
  }): ResumenFinanciero;
}
