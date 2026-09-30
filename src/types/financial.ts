/**
 * @deprecated — TRANSITIONAL SHIM
 *
 * types/financial.ts re-exporta desde @/core/types.
 * Los tipos Tarifario, ResumenFinanciero, etc. viven en el source of truth canónico.
 *
 * Migrar importadores de:
 *   import type { Tarifario } from '@/types/financial'
 * a:
 *   import type { Tarifario } from '@/core/types'
 */
export type {
  RangoTarifario,
  MetodoPagoTarifario,
  TarifasDetalle,
  Tarifario,
  ResumenFinanciero,
} from '@/core/types';
