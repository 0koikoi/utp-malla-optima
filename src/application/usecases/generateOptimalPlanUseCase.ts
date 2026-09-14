import type { Curso } from '../../types/academic';
import {
  generarPlanificacionAutomatica,
  type ResultadoPlanificacionAutomatica,
} from '../../domain/services/automaticPlanningService';

export interface GenerateOptimalPlanInput {
  cursos: Curso[];
  limiteCreditos?: number;
  totalCiclos?: number;
}

export const generateOptimalPlanUseCase = (
  input: GenerateOptimalPlanInput
): ResultadoPlanificacionAutomatica =>
  generarPlanificacionAutomatica(input.cursos, {
    limiteCreditos: input.limiteCreditos,
    totalCiclos: input.totalCiclos,
  });
