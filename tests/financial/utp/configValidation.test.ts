import { describe, expect, it } from 'vitest';
import { validateUniversityConfig } from '../../../src/infrastructure/configuration/schemas/universityConfigValidator';

const validConfig = {
  universidadId: 'pe-utp-ate-pregrado-2026',
  reglasFinancierasId: 'utp',
  tarifarioVersion: '2026',
  sedeId: 'ate',
  moneda: 'PEN',
  sede: 'Ate',
  modalidadEstudio: 'Pregrado regular',
  vigencia: 'Marzo 2026',
};

describe('Validación de configuración UTP', () => {
  it('acepta la configuración UTP actual', () => {
    expect(validateUniversityConfig(validConfig)).toMatchObject(validConfig);
  });

  it('rechaza una versión tarifaria con formato inválido', () => {
    expect(() =>
      validateUniversityConfig({ ...validConfig, tarifarioVersion: '26' })
    ).toThrow(/cuatro dígitos/);
  });

  it('rechaza sedeId con formato inestable', () => {
    expect(() =>
      validateUniversityConfig({ ...validConfig, sedeId: 'Lima Centro' })
    ).toThrow(/minúsculas/);
  });

  it('rechaza una vigencia que no corresponda al año del tarifario', () => {
    expect(() =>
      validateUniversityConfig({ ...validConfig, vigencia: 'Marzo 2027' })
    ).toThrow(/versión tarifaria 2026/);
  });
});
