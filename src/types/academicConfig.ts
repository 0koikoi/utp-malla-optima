/** Forma del archivo academic.json de una universidad. */
export interface AcademicConfig {
  limitesAcademicos?: {
    creditosMinimos: number;
    creditosMaximos: number;
    horasRecomendadasPeriodo: number;
    horasMaximasPlanificacion: number;
    creditosMaximosVerano: number;
    creditosMinimosElectivos: number;
  };
  verano?: {
    multiplicadorHorasTarifarias: number;
  };
}
