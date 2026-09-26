import type { Curso } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import {
  FinancialEngine,
  type FinancialEngineOptions,
} from '../engine/FinancialEngine';
import type { FinancialSummary } from '../models/FinancialPeriod';
import { UniversityFinancialRulesProvider } from '../rules/UniversityFinancialRulesProvider';

/**
 * Fachada de aplicación del módulo financiero.
 * Centraliza la selección de reglas por universidad y evita que los componentes
 * React construyan motores o conozcan implementaciones universitarias concretas.
 */
export class FinancialPlanningService {
  static calcular(
    cursos: Curso[],
    tarifario: Tarifario,
    disciplina: string,
    opciones: FinancialEngineOptions = {}
  ): FinancialSummary {
    const rules = UniversityFinancialRulesProvider.resolve({
      universidadId: tarifario.universidadId,
      reglasFinancierasId: tarifario.reglasFinancierasId,
    });
    const engine = new FinancialEngine(rules);

    return engine.calcular(cursos, tarifario, disciplina, opciones);
  }
}
