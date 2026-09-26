import type { Curso } from '../../../types/academic';
import type { Tarifario, ResumenFinanciero } from '../../../types/financial';
import { calcularPresupuesto } from '../../../utils/budgetEngine';
import type { UniversityFinancialRules } from '../UniversityFinancialRules';

export class UtpFinancialRules implements UniversityFinancialRules {
  calcular(cursos: Curso[], tarifario: Tarifario, disciplina: string, opciones = {}): ResumenFinanciero {
    return calcularPresupuesto(cursos, tarifario, disciplina, {
      ...opciones,
      tipoPeriodo: cursos[0]?.tipoPeriodo ?? 'REGULAR',
    });
  }
}
