import type { Tarifario } from '../../types/financial';

const normalizeId = (value: string): string => value.trim().toLowerCase();
const CURRENT_UTP_RULES_ID = 'utp';

interface LegacyUtpMetadata {
  sedeId?: string;
  tarifarioVersion?: string;
}

const inferMetadataFromUniversityId = (universidadId: string): LegacyUtpMetadata => {
  if (typeof universidadId !== 'string' || !universidadId.trim()) return {};

  const normalized = normalizeId(universidadId);
  const versionMatch = normalized.match(/-(20\d{2})$/);
  const tarifarioVersion = versionMatch?.[1];

  // Formato histórico conocido: pe-utp-<sede>-pregrado-<año>
  // Admite ids de sede compuestos como lima-centro.
  const sedeMatch = normalized.match(/^pe-utp-(.+?)-pregrado(?:-[a-z0-9-]+)?-(20\d{2})$/);
  const sedeId = sedeMatch?.[1];

  return { sedeId, tarifarioVersion };
};

const inferVersionFromLegacyRulesId = (rulesId?: string): string | undefined => {
  if (!rulesId) return undefined;
  return normalizeId(rulesId).match(/^utp-(20\d{2})$/)?.[1];
};

const isKnownLegacyUtpUniversity = (universidadId: string): boolean => {
  if (typeof universidadId !== 'string' || !universidadId.trim()) return false;
  const normalized = normalizeId(universidadId);

  // El fallback sin reglasFinancierasId se limita a formatos históricos que
  // realmente existieron antes de este refactor. No se adivinan años futuros.
  return (
    normalized === 'pe-utp' ||
    (normalized.startsWith('pe-utp-') && normalized.endsWith('-2026'))
  );
};

/**
 * Para datos anteriores a la normalización, toda referencia UTP conocida se
 * resuelve hacia la familia estable de reglas `utp`.
 */
export const inferLegacyFinancialRulesId = (universidadId: string): string | null =>
  isKnownLegacyUtpUniversity(universidadId) ? CURRENT_UTP_RULES_ID : null;

/**
 * Migra un tarifario histórico UTP al formato actual:
 * - `utp-2026` -> `utp`
 * - agrega `tarifarioVersion` cuando puede inferirse de forma segura
 * - agrega `sedeId` cuando el universidadId conserva la sede histórica
 *
 * Si la referencia explícita pertenece a una familia desconocida, no la
 * modifica; el provider financiero producirá después un error explícito.
 */
export const migrateLegacyFinancialRulesReference = (tarifario: Tarifario): Tarifario => {
  if (!tarifario || typeof tarifario !== 'object') return tarifario;

  const explicitRulesId = tarifario.reglasFinancierasId?.trim();
  const normalizedRulesId = explicitRulesId ? normalizeId(explicitRulesId) : undefined;
  const knownLegacyUtp = isKnownLegacyUtpUniversity(tarifario.universidadId);

  if (normalizedRulesId && normalizedRulesId !== 'utp' && !/^utp-20\d{2}$/.test(normalizedRulesId)) {
    return tarifario;
  }

  if (!knownLegacyUtp && !normalizedRulesId?.startsWith('utp')) return tarifario;

  const metadata = inferMetadataFromUniversityId(tarifario.universidadId);
  const inferredVersion =
    tarifario.tarifarioVersion?.trim() ||
    inferVersionFromLegacyRulesId(explicitRulesId) ||
    metadata.tarifarioVersion;
  const inferredSedeId = tarifario.sedeId?.trim() || metadata.sedeId;

  const reglasFinancierasId = CURRENT_UTP_RULES_ID;
  const changed =
    tarifario.reglasFinancierasId !== reglasFinancierasId ||
    (!tarifario.tarifarioVersion && Boolean(inferredVersion)) ||
    (!tarifario.sedeId && Boolean(inferredSedeId));

  if (!changed) return tarifario;

  return {
    ...tarifario,
    reglasFinancierasId,
    ...(inferredVersion ? { tarifarioVersion: inferredVersion } : {}),
    ...(inferredSedeId ? { sedeId: inferredSedeId } : {}),
  };
};
