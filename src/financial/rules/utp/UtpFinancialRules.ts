import type { CursoEnPlanificador, Tarifario, ResumenFinanciero } from '@/core/types';
import { calcularPresupuesto } from '../../../utils/budgetEngine';
import type { UniversityFinancialRules } from '../UniversityFinancialRules';

export class UtpFinancialRules implements UniversityFinancialRules {
  calcular(cursos: CursoEnPlanificador[], tarifario: Tarifario, disciplina: string, opciones = {}): ResumenFinanciero {
    return calcularPresupuesto(cursos, tarifario, disciplina, {
      ...opciones,
      tipoPeriodo: cursos[0]?.tipoPeriodo ?? 'REGULAR',
    });
  }
}

export { UtpFinancialRules as Utp2026Rules };
