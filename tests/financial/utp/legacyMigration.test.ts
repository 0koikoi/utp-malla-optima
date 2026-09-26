import { describe, expect, it } from 'vitest';
import type { Tarifario } from '../../../src/types/financial';
import { migrateLegacyFinancialRulesReference } from '../../../src/financial/rules/financialRulesCompatibility';

const legacyTarifario = (): Tarifario => ({
  universidadId: 'pe-utp-ate-pregrado-2026',
  reglasFinancierasId: 'utp-2026',
  moneda: 'PEN',
  modalidadPrincipal: 'ESCALA_FIJA',
  cuotasPorCiclo: 5,
  semanasPorCiclo: 16,
  disciplinas: {
    'Ingeniería y Arquitectura': {
      costoMatriculaRegular: 398,
      costoPorCredito: 0,
      costoPorHora: 0,
      costoPorCurso: 0,
      costoFijoLaboratorio: 0,
      recargoRepitenciaPorcentaje: 0,
    },
  },
});

describe('Migración de referencias financieras UTP antiguas', () => {
  it('convierte utp-2026 en utp y conserva el año como versión tarifaria', () => {
    const migrated = migrateLegacyFinancialRulesReference(legacyTarifario());

    expect(migrated.reglasFinancierasId).toBe('utp');
    expect(migrated.tarifarioVersion).toBe('2026');
    expect(migrated.sedeId).toBe('ate');
  });

  it('no reemplaza metadatos nuevos que ya estén definidos', () => {
    const current: Tarifario = {
      ...legacyTarifario(),
      reglasFinancierasId: 'utp',
      tarifarioVersion: '2026',
      sedeId: 'ate',
    };

    expect(migrateLegacyFinancialRulesReference(current)).toBe(current);
  });

  it('no altera una familia de reglas explícita y desconocida', () => {
    const unknown: Tarifario = {
      ...legacyTarifario(),
      reglasFinancierasId: 'otra-regla',
    };

    expect(migrateLegacyFinancialRulesReference(unknown)).toBe(unknown);
  });

  it('no adivina reglas para un tarifario futuro sin referencia explícita', () => {
    const future: Tarifario = {
      ...legacyTarifario(),
      universidadId: 'pe-utp-ate-pregrado-2027',
      reglasFinancierasId: undefined,
    };

    expect(migrateLegacyFinancialRulesReference(future)).toBe(future);
  });
});
