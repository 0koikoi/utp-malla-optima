/**
 * src/store/index.ts — Punto de entrada unificado del Store (Fase 2)
 *
 * Exporta el store canónico `plannerStore`, tipos y selectores optimizados con `useShallow`.
 */

export { usePlannerStore, useShallow } from './plannerStore';
export type { PlannerState, PeriodoIngreso } from './plannerStore';
export * from './selectors';
