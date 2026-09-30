/** Forma del archivo academic.json de una universidad. */
export interface AcademicConfig {
  limitesAcademicos?: {
    creditosMinimos: number;
    creditosMaximos: number;
  };
  verano?: {
    multiplicadorHorasTarifarias: number;
  };
}
