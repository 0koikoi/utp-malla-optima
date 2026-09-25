/**
 * @deprecated — TRANSITIONAL SHIM
 *
 * Este archivo re-exporta desde @/core/types para mantener compatibilidad
 * mientras se migran los importadores. NO añadir lógica nueva aquí.
 *
 * Mapeo:
 *   - 'Curso' en este módulo = CursoEnPlanificador (tiene ciclo, tipoPeriodo,
 *     ubicacion 'banco'|'periodo', y prerrequisitos).
 *   - Los campos extra (tipoPeriodo, ubicacion, ciclo) se eliminarán en Fase 2
 *     cuando useAcademicStore sea unificado con mallaStore.
 */

export type {
  EstadoCurso,
  TipoCurso,
  ModalidadCalculo,
  TipoPeriodo as TipoPeriodoAcademico,
  PeriodoAcademico,
  RangoTarifario,
  MetodoPagoTarifario,
  TarifasDetalle,
  Tarifario,
  ResumenFinanciero,
  CursoReferencia,
  TipoNotificacionMovimiento,
  NotificacionMovimiento,
} from '@/core/types';

// El 'Curso' del mundo academic tiene campos extra del planificador.
// Se re-exporta CursoEnPlanificador bajo el alias Curso para mantener
// compatibilidad con todos los importadores actuales.
export type { CursoEnPlanificador as Curso } from '@/core/types';

// UbicacionCurso en academic.ts era 'banco'|'periodo' (concepto diferente al
// del planificador). Se mantiene como tipo local hasta que los consumidores
// sean migrados en Fase 2.
/** @deprecated — usar UbicacionCurso de @/core/types para el planificador */
export type UbicacionCurso = 'banco' | 'periodo';
