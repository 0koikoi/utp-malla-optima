import type { UniversityFinancialRules } from './UniversityFinancialRules';

export interface FinancialRulesRegistration {
  id: string;
  create: () => UniversityFinancialRules;
}

const registrations = new Map<string, FinancialRulesRegistration>();

export function registerFinancialRules(registration: FinancialRulesRegistration): void {
  const id = registration.id.trim().toLowerCase();
  if (registrations.has(id)) throw new Error(`Las reglas ${id} ya están registradas.`);
  registrations.set(id, registration);
}

export const getFinancialRules = (id: string): FinancialRulesRegistration | undefined =>
  registrations.get(id);
