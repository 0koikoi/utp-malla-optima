import type { UniversityFinancialRules } from './UniversityFinancialRules';
import { inferLegacyFinancialRulesId } from './financialRulesCompatibility';
import './registerFinancialRules';
import { getFinancialRules, registerFinancialRules, type FinancialRulesRegistration } from './financialRulesRegistry';

export interface FinancialRulesReference {
  universidadId: string;
  reglasFinancierasId?: string;
}

export interface FinancialRulesResolver {
  resolve(reference: FinancialRulesReference): UniversityFinancialRules;
}

const normalizeId = (value: string): string => value.trim().toLowerCase();

/**
 * Resuelve reglas financieras por un identificador explícito y estable.
 *
 * Para respaldos/IndexedDB anteriores a la fase 4, y únicamente cuando
 * reglasFinancierasId no existe, se mantiene un fallback compatible basado
 * en universidadId. Una referencia explícita desconocida siempre falla.
 */
export class UniversityFinancialRulesProvider implements FinancialRulesResolver {
  register(registration: FinancialRulesRegistration): void {
    registerFinancialRules(registration);
  }

  resolve(reference: FinancialRulesReference): UniversityFinancialRules {
    const explicitRulesId = reference.reglasFinancierasId?.trim();
    const rulesId = explicitRulesId
      ? normalizeId(explicitRulesId)
      : inferLegacyFinancialRulesId(reference.universidadId);

    if (!rulesId) {
      throw new Error(
        `No se pudo determinar qué reglas financieras corresponden a la universidad "${reference.universidadId}".`
      );
    }

    const registration = getFinancialRules(rulesId);

    if (!registration) {
      throw new Error(
        `No existen reglas financieras registradas con el identificador "${rulesId}".`
      );
    }

    return registration.create();
  }
}
