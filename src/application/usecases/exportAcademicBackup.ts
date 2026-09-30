import type { Curso } from '../../types/academic';
import type { Tarifario } from '@/core/types';
import { migrateLegacyFinancialRulesReference } from '../../financial/rules/financialRulesCompatibility';
import { CURRENT_ACADEMIC_BACKUP_VERSION } from './academicBackupVersion';

export interface AcademicBackup {
  version: number;
  fecha: string;
  cursos: Curso[];
  tarifario: Tarifario | null;
}

export const exportAcademicBackup = (
  cursos: Curso[],
  tarifario: Tarifario | null
): Blob => {
  const data: AcademicBackup = {
    version: CURRENT_ACADEMIC_BACKUP_VERSION,
    fecha: new Date().toISOString(),
    cursos,
    tarifario: tarifario ? migrateLegacyFinancialRulesReference(tarifario) : null,
  };

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
};
