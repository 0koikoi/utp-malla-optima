import type { Curso, PeriodoIngreso } from '../../types/academic';
import {
  generarPlanificacionAutomatica,
  type ResultadoPlanificacionAutomatica,
} from '../../domain/services/automaticPlanningService';

export interface GenerateOptimalPlanInput {
  cursos: Curso[];
  totalCiclos?: number;
  ciclosExcluidos?: number[];
  cicloActual?: number | null;
  periodoIngreso?: PeriodoIngreso | null;
}

export const generateOptimalPlanUseCase = (
  input: GenerateOptimalPlanInput
): ResultadoPlanificacionAutomatica =>
  generarPlanificacionAutomatica(input.cursos, {
    totalCiclos: input.totalCiclos,
    ciclosExcluidos: input.ciclosExcluidos,
    cicloActual: input.cicloActual,
    periodoIngreso: input.periodoIngreso,
  });
