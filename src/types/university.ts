/** Forma del archivo university.json de una universidad. */
export interface UniversityConfig {
  universidadId: string;
  /** Identificador estable de la familia de reglas financieras a aplicar. */
  reglasFinancierasId: string;
  /** Versión del tarifario UTP que debe cargarse (por ejemplo, 2026). */
  tarifarioVersion: string;
  /** Identificador estable y normalizado de la sede (por ejemplo, ate). */
  sedeId: string;
  moneda: string;
  sede?: string;
  modalidadEstudio?: string;
  vigencia?: string;
}
