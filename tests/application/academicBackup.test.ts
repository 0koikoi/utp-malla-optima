import { describe, expect, it } from 'vitest';
import { parseAcademicBackup } from '../../src/application/usecases/importAcademicBackup';
import { CURRENT_ACADEMIC_BACKUP_VERSION } from '../../src/application/usecases/academicBackupVersion';

const legacyTarifario = {
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
};

describe('Migración de respaldos académicos', () => {
  it('migra un respaldo v2 UTP al formato tarifario actual', () => {
    const parsed = parseAcademicBackup(
      JSON.stringify({ version: 2, cursos: [], tarifario: legacyTarifario })
    );

    expect(parsed.tarifario?.reglasFinancierasId).toBe('utp');
    expect(parsed.tarifario?.tarifarioVersion).toBe('2026');
    expect(parsed.tarifario?.sedeId).toBe('ate');
  });

  it('admite respaldos antiguos sin versión explícita', () => {
    const parsed = parseAcademicBackup(
      JSON.stringify({ cursos: [], tarifario: legacyTarifario })
    );

    expect(parsed.tarifario?.reglasFinancierasId).toBe('utp');
  });

  it('rechaza respaldos creados por una versión futura incompatible', () => {
    expect(() =>
      parseAcademicBackup(
        JSON.stringify({
          version: CURRENT_ACADEMIC_BACKUP_VERSION + 1,
          cursos: [],
          tarifario: null,
        })
      )
    ).toThrow(/solo admite hasta/);
  });
});
