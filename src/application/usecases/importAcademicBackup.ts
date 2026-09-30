import type { Curso } from '../../types/academic';
import type { Tarifario } from '@/core/types';
import { migrateLegacyFinancialRulesReference } from '../../financial/rules/financialRulesCompatibility';
import { CURRENT_ACADEMIC_BACKUP_VERSION } from './academicBackupVersion';

export interface ImportedBackup {
  cursos: Curso[];
  tarifario: Tarifario | null;
}

interface RawAcademicBackup {
  version?: unknown;
  cursos?: unknown;
  tarifario?: unknown;
}

const parseBackupVersion = (value: unknown): number => {
  // Los primeros respaldos no incluían necesariamente una versión explícita.
  if (value === undefined || value === null) return 1;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error('Versión de respaldo inválida');
  }
  if (value > CURRENT_ACADEMIC_BACKUP_VERSION) {
    throw new Error(
      `El respaldo usa la versión ${value}, pero esta aplicación solo admite hasta la versión ${CURRENT_ACADEMIC_BACKUP_VERSION}.`
    );
  }
  return value;
};

export const parseAcademicBackup = (text: string): ImportedBackup => {
  const data = JSON.parse(text) as RawAcademicBackup;

  parseBackupVersion(data.version);

  if (!Array.isArray(data.cursos)) {
    throw new Error('Archivo de respaldo inválido');
  }

  if (
    data.tarifario !== undefined &&
    data.tarifario !== null &&
    (typeof data.tarifario !== 'object' || Array.isArray(data.tarifario))
  ) {
    throw new Error('El tarifario del respaldo es inválido');
  }

  const tarifario = data.tarifario
    ? migrateLegacyFinancialRulesReference(data.tarifario as Tarifario)
    : null;

  return {
    cursos: data.cursos as Curso[],
    tarifario,
  };
};

export const importAcademicBackup = async (
  file: File
): Promise<ImportedBackup> => parseAcademicBackup(await file.text());
