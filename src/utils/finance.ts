/**
 * @deprecated — TRANSITIONAL SHIM (Fase 4)
 *
 * `utils/finance.ts` ahora delega al motor financiero canónico unificado
 * en `@/core/services/financialService`.
 *
 * Migrar importadores en fases posteriores a:
 *   import { calcularFinanzasCiclo, formatSoles } from '@/core/services/financialService';
 */

import type { Curso, FinanzasCiclo } from '@/core/types';
import type { FacultadKey } from '@/data/tarifario';
import {
  calcularFinanzasCiclo as calcularFinanzasCicloCanonica,
  calcularCostoBase,
  calcularCreditosElectivos,
  formatSoles,
} from '@/core/services/financialService';

export {
  calcularCostoBase,
  calcularCreditosElectivos,
  formatSoles,
};

/**
 * Wrapper de compatibilidad para la firma posicional legacy:
 * (cicloId, cursosPendientes, facultad, descuento, esVerano)
 */
export function calcularFinanzasCiclo(
  cicloId: string,
  cursosPendientes: Curso[],
  facultad: FacultadKey,
  metodoPago: string,
  esVerano: boolean
): FinanzasCiclo {
  return calcularFinanzasCicloCanonica(cursosPendientes, {
    cicloId,
    facultad,
    metodoPago,
    esVerano,
  });
}
