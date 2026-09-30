/**
 * @deprecated — TRANSITIONAL SHIM
 *
 * Este archivo re-exporta desde @/core/types para mantener compatibilidad
 * mientras se migran los importadores. NO añadir lógica nueva aquí.
 *
 * Diferencias absorbidas:
 *   - TipoCurso 'O'|'E'  →  'OBLIGATORIO'|'ELECTIVO'  (el parser ya normaliza)
 *   - campo 'horas'       →  'horasSemanales'           (renombrado en Curso)
 *   - campo 'prerequisitos' = mismo nombre (typo de 'prerrequisitos' corregido)
 *   - EstadoCurso no incluía 'EN_CURSO'  →  ahora sí, sin breaking change
 *   - UbicacionCurso añade 'pozo' como literal explícito
 */

export type {
  EstadoCurso,
  TipoCurso,
  TipoPeriodo as TipoCiclo,
  UbicacionCurso,
  Curso,
  FinanzasCiclo,
  MallaSnapshot,
} from '@/core/types';
