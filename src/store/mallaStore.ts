/**
 * @deprecated — TRANSITIONAL SHIM (Fase 2)
 *
 * mallaStore.ts ahora re-exporta desde plannerStore para mantener
 * compatibilidad con todos los importadores existentes.
 *
 * Migrar importadores de:
 *   import { useMallaStore } from '@/store/mallaStore'
 * a:
 *   import { usePlannerStore } from '@/store/plannerStore'
 */

export { usePlannerStore as useMallaStore } from './plannerStore';
export type { PeriodoIngreso } from './plannerStore';
export type { PlannerState as MallaState } from './plannerStore';
