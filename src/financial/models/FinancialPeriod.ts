import type { CursoEnPlanificador, ResumenFinanciero } from '@/core/types';

export interface FinancialPeriod {
  id: string;
  etiqueta: string;
  cursos: CursoEnPlanificador[];
  resumen: ResumenFinanciero;
}

export interface FinancialSummary {
  periodos: FinancialPeriod[];
  totalGeneral: number;
}
