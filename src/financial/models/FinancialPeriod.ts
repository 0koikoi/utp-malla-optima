import type { Curso, ResumenFinanciero } from '../../types/academic';

export interface FinancialPeriod {
  id: string;
  etiqueta: string;
  cursos: Curso[];
  resumen: ResumenFinanciero;
}

export interface FinancialSummary {
  periodos: FinancialPeriod[];
  totalGeneral: number;
}
