import type { UniversityFinancialRules } from './UniversityFinancialRules';
import { inferLegacyFinancialRulesId } from './financialRulesCompatibility';
import { UtpFinancialRules } from './utp/UtpFinancialRules';

interface FinancialRulesRegistration {
  id: string;
  create: () => UniversityFinancialRules;
}

export interface FinancialRulesReference {
  universidadId: string;
  reglasFinancierasId?: string;
}

const normalizeId = (value: string): string => value.trim().toLowerCase();

const REGISTRATIONS: FinancialRulesRegistration[] = [
  {
    id: 'utp',
    create: () => new UtpFinancialRules(),
  },
  {
    // Alias temporal para tarifarios persistidos antes de normalizar el id de reglas.
    id: 'utp-2026',
    create: () => new UtpFinancialRules(),
  },
];

/**
 * Resuelve reglas financieras por un identificador explícito y estable.
 *
 * Para respaldos/IndexedDB anteriores a la fase 4, y únicamente cuando
 * reglasFinancierasId no existe, se mantiene un fallback compatible basado
 * en universidadId. Una referencia explícita desconocida siempre falla.
 */
export class UniversityFinancialRulesProvider {
  static resolve(reference: FinancialRulesReference): UniversityFinancialRules {
    const explicitRulesId = reference.reglasFinancierasId?.trim();
    const rulesId = explicitRulesId
      ? normalizeId(explicitRulesId)
      : inferLegacyFinancialRulesId(reference.universidadId);

    if (!rulesId) {
      throw new Error(
        `No se pudo determinar qué reglas financieras corresponden a la universidad "${reference.universidadId}".`
      );
    }

    const registration = REGISTRATIONS.find(({ id }) => id === rulesId);

    if (!registration) {
      throw new Error(
        `No existen reglas financieras registradas con el identificador "${rulesId}".`
      );
    }

    return registration.create();
  }
}
