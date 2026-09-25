/**
 * Tipos canónicos de dominio — UTP Malla Óptima
 *
 * Este es el único source of truth para los tipos de negocio.
 * Todos los módulos deben importar desde aquí (o desde @/core/types).
 *
 * Historial:
 *   - Unifica types/malla.ts  (TipoCurso: 'O'|'E', campo 'horas', 'prerequisitos')
 *   - Unifica types/academic.ts (TipoCurso: 'OBLIGATORIO'|'ELECTIVO', 'horasSemanales', 'prerrequisitos')
 */

// ─── Enums de dominio ────────────────────────────────────────────────────────

export type EstadoCurso =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'CONVALIDADO'
  | 'EN_CURSO';

/** Forma canónica: 'OBLIGATORIO' | 'ELECTIVO' (antes también 'O' | 'E' en malla.ts) */
export type TipoCurso = 'OBLIGATORIO' | 'ELECTIVO';

export type TipoPeriodo = 'REGULAR' | 'VERANO';

export type ModalidadCalculo =
  | 'POR_CREDITO'
  | 'POR_HORA'
  | 'POR_CURSO'
  | 'ESCALA_FIJA';

// ─── Identificadores de ubicación ────────────────────────────────────────────

/**
 * Identifica dónde está colocado un curso en el planificador.
 * Forma canónica: `ciclo-N`, `verano-N`, o `'pozo'` (panel de pendientes).
 */
export type UbicacionCurso =
  | `ciclo-${number}`   // e.g. 'ciclo-3'
  | `verano-${number}`  // e.g. 'verano-1'
  | 'pozo';             // panel de pendientes

// ─── Entidades de dominio ─────────────────────────────────────────────────────

export interface Curso {
  /** Código único del curso (e.g. 'CS101') */
  codigo: string;
  nombre: string;
  /** Horas semanales de clases (unifica 'horas' de malla.ts y 'horasSemanales' de academic.ts) */
  horasSemanales: number;
  creditos: number;
  tipo: TipoCurso;
  estado: EstadoCurso;
  /** Códigos de cursos prerrequisito (unifica 'prerequisitos' y 'prerrequisitos') */
  prerequisitos: string[];
  /** Nombres de cursos que este curso habilita (calculado en el parser) */
  habilitaA: string[];
  /** Ciclo oficial de la malla de estudios */
  cicloOrigen: number;
  /** Disciplina/área de conocimiento (opcional, usado por motor financiero) */
  disciplina?: string;
  /** Si el curso tiene componente de laboratorio (afecta tarifario) */
  esLaboratorio?: boolean;
}

/**
 * Extiende Curso con estado de ubicación dentro del planificador.
 * Usado exclusivamente por useAcademicStore y el mundo 'academic'.
 * En la migración final (Fase 2) este tipo será reabsorbido por el store unificado.
 */
export interface CursoEnPlanificador extends Curso {
  /** Ciclo/verano en que está colocado en el planificador (puede diferir de cicloOrigen) */
  ciclo: number;
  tipoPeriodo: TipoPeriodo;
  /** Ubicación dentro del store academic: 'banco' (sin asignar) | 'periodo' (planificado) */
  ubicacion: 'banco' | 'periodo';
  /** Alias de prerequisitos con el typo heredado del mundo academic */
  prerrequisitos: string[];
}

export interface PeriodoAcademico {
  id: `ciclo-${number}` | `verano-${number}`;
  tipo: TipoPeriodo;
  cicloReferencia: number;
  /** Orden cronológico: ciclo-1 → 1.0, verano-1 → 1.5, ciclo-2 → 2.0, … */
  orden: number;
  etiqueta: string;
}

// ─── Tipos financieros ────────────────────────────────────────────────────────

/** Resumen de costos calculado por periodo visible en el planificador */
export interface FinanzasCiclo {
  cicloId: string;
  horasSemanales: number;
  creditos: number;
  costoFinal: number;
  matricula: number;
  excesoHoras: boolean;
  excesoCreditosVerano: boolean;
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
  tipoPeriodo: TipoPeriodo;
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

// ─── Tipos de notificación/validación ────────────────────────────────────────

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

// ─── Persistencia ────────────────────────────────────────────────────────────

/** Snapshot de la malla guardada en localStorage */
export interface MallaSnapshot {
  version: 1;
  timestamp: string;
  nombreArchivo: string;
  cursos: Record<string, Curso>;
}
