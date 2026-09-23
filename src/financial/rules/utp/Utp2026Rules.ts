import type { Curso, Tarifario, ResumenFinanciero } from '../../../types/academic';
import { calcularPresupuesto } from '../../../utils/budgetEngine';
import type { UniversityFinancialRules } from '../UniversityFinancialRules';

export class Utp2026Rules implements UniversityFinancialRules {
  calcular(cursos: Curso[], tarifario: Tarifario, disciplina: string, opciones = {}): ResumenFinanciero {
    return calcularPresupuesto(cursos, tarifario, disciplina, {
      ...opciones,
      tipoPeriodo: cursos[0]?.tipoPeriodo ?? 'REGULAR',
    });
  }
}
