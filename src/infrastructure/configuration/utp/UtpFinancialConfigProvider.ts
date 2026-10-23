import { z } from 'zod';
import ate2026FinancialConfig from '../../../data/universidades/pe-utp/financial/2026/ate.json';
import type { FinancialConfig } from '../../../types/financialConfig';
import { validateFinancialConfig } from '../schemas/financialConfigValidator';
import { parseConfigWithSchema } from '../schemas/zodConfigError';

export interface UtpFinancialConfigSelection {
  sedeId: string;
  tarifarioVersion: string;
}

interface UtpFinancialConfigRegistration extends UtpFinancialConfigSelection {
  config: unknown;
}

const UtpFinancialConfigSelectionSchema: z.ZodType<UtpFinancialConfigSelection> = z
  .object({
    sedeId: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'debe usar minúsculas, números y guiones'
      ),
    tarifarioVersion: z
      .string()
      .trim()
      .regex(/^20\d{2}$/, 'debe usar un año de cuatro dígitos'),
  })
  .strict();

const normalizeSelection = (
  selection: UtpFinancialConfigSelection
): UtpFinancialConfigSelection =>
  parseConfigWithSchema(
    UtpFinancialConfigSelectionSchema,
    selection,
    'selección tarifaria UTP'
  );

/**
 * Registro local e histórico de tarifarios UTP soportados.
 * Cada combinación sede + versión ocupa una entrada independiente: agregar 2027
 * no reemplaza ni elimina la configuración 2026.
 */
const UTP_FINANCIAL_CONFIGS: readonly UtpFinancialConfigRegistration[] = [
  {
    tarifarioVersion: '2026',
    sedeId: 'ate',
    config: ate2026FinancialConfig,
  },
];

const selectionKey = ({
  sedeId,
  tarifarioVersion,
}: UtpFinancialConfigSelection): string => `${tarifarioVersion}:${sedeId}`;

const assertUniqueRegistrations = (): void => {
  const seen = new Set<string>();

  for (const registration of UTP_FINANCIAL_CONFIGS) {
    const key = selectionKey(registration);
    if (seen.has(key)) {
      throw new Error(`El tarifario UTP "${key}" está registrado más de una vez.`);
    }
    seen.add(key);
  }
};

assertUniqueRegistrations();

/**
 * Carga y valida el tarifario UTP correspondiente a una sede y versión concretas.
 * La selección siempre es exacta: nunca se sustituye silenciosamente por el año
 * más reciente ni por otra sede.
 */
export class UtpFinancialConfigProvider {
  static load(selection: UtpFinancialConfigSelection): FinancialConfig {
    const normalized = normalizeSelection(selection);
    const registration = UTP_FINANCIAL_CONFIGS.find(
      (candidate) => selectionKey(candidate) === selectionKey(normalized)
    );

    if (!registration) {
      throw new Error(
        `No existe un tarifario UTP registrado para la sede "${normalized.sedeId}" y la versión "${normalized.tarifarioVersion}".`
      );
    }

    return validateFinancialConfig(
      registration.config,
      `financial/${normalized.tarifarioVersion}/${normalized.sedeId}.json`
    );
  }

  static isRegistered(selection: UtpFinancialConfigSelection): boolean {
    const normalized = normalizeSelection(selection);
    return UTP_FINANCIAL_CONFIGS.some(
      (candidate) => selectionKey(candidate) === selectionKey(normalized)
    );
  }

  static listAvailable(): UtpFinancialConfigSelection[] {
    return UTP_FINANCIAL_CONFIGS.map(({ sedeId, tarifarioVersion }) => ({
      sedeId,
      tarifarioVersion,
    }));
  }
}
