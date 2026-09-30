import type { ModalidadCalculo, TipoPeriodoAcademico } from './academic';

export interface RangoTarifario {
  minHoras: number;
  maxHoras: number;
  montoCuota: number;
}

export interface MetodoPagoTarifario {
  nombre: string;
  descuentoPorcentaje: number;
  requiereProntoPago?: boolean;
}

export interface TarifasDetalle {
  costoMatriculaRegular: number;
  costoPorCredito: number;
  costoPorHora: number;
  costoPorCurso: number;
  costoFijoLaboratorio: number;
  recargoRepitenciaPorcentaje: number;
  rangosPension?: RangoTarifario[];
  costoHoraAdicional?: number;
}

/**
 * Contrato consumido por la aplicación después de componer y validar
 * la configuración de una universidad.
 *
 * No representa el contenido de un único JSON: es la vista normalizada
 * que usan el store, el motor financiero y los servicios académicos.
 */
export interface Tarifario {
  universidadId: string;
  /**
   * Identificador de la implementación de reglas financieras.
   * Es opcional únicamente para poder leer tarifarios/respaldos creados antes de la fase 4.
   */
  reglasFinancierasId?: string;
  /** Versión de los datos tarifarios usados en este cálculo (por ejemplo, 2026). */
  tarifarioVersion?: string;
  /** Identificador estable de la sede cuyos precios se están usando. */
  sedeId?: string;
  moneda: string;
  modalidadPrincipal: ModalidadCalculo;
  cuotasPorCiclo: number;
  semanasPorCiclo: number;
  disciplinas: Record<string, TarifasDetalle>;
  sede?: string;
  modalidadEstudio?: string;
  vigencia?: string;
  metodosPago?: Record<string, MetodoPagoTarifario>;
  cuotasPorVerano?: number;
  costoMatriculaVerano?: number;
  descuentoPagoUnicoRegular?: number;
  costoProgramaSaludEstudiantil?: number;
  limitesAcademicos?: {
    creditosMinimos: number;
    creditosMaximos: number;
  };
  /** Multiplicador de horas usado solo para el cálculo tarifario de verano. */
  multiplicadorHorasVerano?: number;
  /** @deprecated Campo legado. Se conserva temporalmente por compatibilidad con respaldos antiguos. */
  multiplicadorCostoVerano?: number;
}

export interface ResumenFinanciero {
  totalCreditos: number;
  totalHorasSemanales: number;
  horasTarifarias: number;
  tipoPeriodo: TipoPeriodoAcademico;
  costoMatricula: number;
  cuotaBase: number;
  descuentoPorcentaje: number;
  descuentoMontoPorCuota: number;
  costoEnsenanzaTotal: number;
  costoTotalCiclo: number;
  montoPorCuota: number;
  numeroCuotas: number;
  horasExceso: number;
  costoHorasExcesoPorCuota: number;
  pagoUnico: boolean;
  descuentoPagoUnicoMonto: number;
}
