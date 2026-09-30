/**
 * @deprecated — TRANSITIONAL SHIM (Fase 3)
 *
 * `services/backupService.ts` ahora re-exporta desde `@/adapters/backupAdapter`.
 * Migrar importadores a:
 *   import { descargarRespaldoJSON, leerRespaldoJSON, downloadBlob } from '@/adapters/backupAdapter';
 */

export * from '@/adapters/backupAdapter';
