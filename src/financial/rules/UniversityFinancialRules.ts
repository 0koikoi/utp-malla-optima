import type { CursoEnPlanificador, Tarifario, ResumenFinanciero } from '@/core/types';

export interface UniversityFinancialRules {
  calcular(cursos: CursoEnPlanificador[], tarifario: Tarifario, disciplina: string, opciones?: {
    metodoPago?: string;
    pagoUnico?: boolean;
  }): ResumenFinanciero;
}
