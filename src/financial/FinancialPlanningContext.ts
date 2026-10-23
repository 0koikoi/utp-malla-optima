import { createContext, useContext } from 'react';
import type { FinancialPlanningService } from './services/FinancialPlanningService';

export const FinancialPlanningContext = createContext<FinancialPlanningService | null>(null);

export function useFinancialPlanning(): FinancialPlanningService {
  const service = useContext(FinancialPlanningContext);
  if (!service) throw new Error('Falta configurar el servicio de planificación financiera.');
  return service;
}
