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
  /** Si es true, el verano que sigue al ciclo del jalado (cuando existe) forma parte de su ventana. */
  jaladoPermiteVerano?: boolean;
}
