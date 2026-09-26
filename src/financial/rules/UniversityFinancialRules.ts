import type { Curso } from '../../types/academic';
import type { Tarifario, ResumenFinanciero } from '../../types/financial';

export interface UniversityFinancialRules {
  calcular(cursos: Curso[], tarifario: Tarifario, disciplina: string, opciones?: {
    metodoPago?: string;
    pagoUnico?: boolean;
  }): ResumenFinanciero;
}
