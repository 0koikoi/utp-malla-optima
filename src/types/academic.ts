export type EstadoCurso = 'APROBADO' | 'CONVALIDADO' | 'EN_CURSO' | 'PENDIENTE';
export type TipoCurso = 'OBLIGATORIO' | 'ELECTIVO';
export type ModalidadCalculo = 'POR_CREDITO' | 'POR_HORA' | 'POR_CURSO' | 'ESCALA_FIJA';

export type TipoPeriodoAcademico = 'REGULAR' | 'VERANO';
export type UbicacionCurso = 'banco' | 'periodo';

export interface PeriodoAcademico {
  id: `ciclo-${number}` | `verano-${number}`;
  tipo: TipoPeriodoAcademico;
  cicloReferencia: number;
  orden: number;
  etiqueta: string;
}

export interface Curso {
  codigo: string;
  nombre: string;
  disciplina?: string;
  ciclo: number;
  cicloOrigen: number;
  tipoPeriodo: TipoPeriodoAcademico;
  ubicacion: UbicacionCurso;
  horasSemanales: number;
  creditos: number;
  tipo: TipoCurso;
  prerrequisitos: string[];
  esLaboratorio?: boolean;
  estado: EstadoCurso;
}

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

export interface Tarifario {
  universidadId: string;
  moneda: string;
  modalidadPrincipal: ModalidadCalculo;
  cuotasPorCiclo: number;
  semanasPorCiclo: number;
  disciplinas: Record<string, TarifasDetalle>;
  sede?: string;
  modalidadEstudio?: string;
  vigencia?: string;
  metodosPago?: Record<string, MetodoPagoTarifario>;
  multiplicadorCostoVerano?: number;
  cuotasPorVerano?: number;
  costoMatriculaVerano?: number;
  descuentoPagoUnicoRegular?: number;
  costoProgramaSaludEstudiantil?: number;
  limitesAcademicos?: {
    creditosMinimos: number;
    creditosMaximos: number;
  };
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

export interface CursoReferencia {
  codigo: string;
  nombre: string;
}

export type TipoNotificacionMovimiento =
  | 'PRERREQUISITOS'
  | 'INMOVIBLE'
  | 'PERIODO_ANTERIOR'
  | 'PERIODO_ACTUAL'
  | 'LIMITE_CREDITOS_VERANO'
  | 'LIMITE_HORAS';

export interface NotificacionMovimiento {
  tipo: TipoNotificacionMovimiento;
  cursoNombre: string;
  faltantes?: CursoReferencia[];
  mensaje?: string;
  periodoDestino?: string;
  limite?: number;
  valorActual?: number;
}
