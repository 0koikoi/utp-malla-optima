import type { Curso } from '../../types/academic';
import type { ResumenFinanciero } from '../../types/financial';

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
