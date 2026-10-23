import { AcademicConfigLoader } from '../infrastructure/configuration/AcademicConfigLoader';

const academic = AcademicConfigLoader.load();
if (!academic.limitesAcademicos || !academic.verano) {
  throw new Error('La configuración académica debe definir límites y verano.');
}

export const ACADEMIC_LIMITS = {
  ...academic.limitesAcademicos,
  factorHorasVerano: academic.verano.multiplicadorHorasTarifarias,
};

/** Regla UTP: si el verano que sigue al ciclo del jalado forma parte de su ventana de recuperación. */
export const JALADO_PERMITE_VERANO = academic.jaladoPermiteVerano ?? false;

export type AcademicLimits = typeof ACADEMIC_LIMITS;
