import { AcademicConfigLoader } from '../infrastructure/configuration/AcademicConfigLoader';

const academic = AcademicConfigLoader.load();
if (!academic.limitesAcademicos || !academic.verano) {
  throw new Error('La configuración académica debe definir límites y verano.');
}

export const ACADEMIC_LIMITS = {
  ...academic.limitesAcademicos,
  factorHorasVerano: academic.verano.multiplicadorHorasTarifarias,
};

export type AcademicLimits = typeof ACADEMIC_LIMITS;
