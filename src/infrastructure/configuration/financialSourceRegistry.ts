import type { FinancialConfig } from '../../types/financialConfig';

export interface FinancialConfigSource {
  readonly reglasFinancierasId: string;
  load(selection: { sedeId: string; tarifarioVersion: string }): FinancialConfig;
}

const sources = new Map<string, FinancialConfigSource>();

export function registerFinancialSource(source: FinancialConfigSource): void {
  if (sources.has(source.reglasFinancierasId)) {
    throw new Error(`La fuente financiera ${source.reglasFinancierasId} ya está registrada.`);
  }
  sources.set(source.reglasFinancierasId, source);
}

export const getFinancialSource = (id: string): FinancialConfigSource | undefined => sources.get(id);
