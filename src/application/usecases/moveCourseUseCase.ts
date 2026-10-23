import type { Curso, PeriodoAcademico, PeriodoIngreso } from '../../types/academic';
import { cursoBloqueado } from '../../domain/rules/courseRules';
import {
  validarDestinoNoAnterior,
  validarLimiteCreditosVerano,
  validarLimiteHorasPeriodo,
  validarRecargoHorasPeriodo,
} from '../../domain/rules/planningRules';
import { validarPrerequisitosParaPeriodo } from '../../domain/services/prerequisiteService';
import { obtenerPeriodoCurso } from '../../domain/rules/academicPeriodRules';
import { permiteVeranoDespuesDe, periodoBloqueadoPorCicloActual } from '../../domain/rules/academicContextRules';

export type MoveCourseFailureReason =
  | 'NOT_FOUND'
  | 'LOCKED'
  | 'PAST_PERIOD'
  | 'CURRENT_PERIOD'
  | 'PREREQUISITES'
  | 'SUMMER_CREDIT_LIMIT'
  | 'SUMMER_NOT_AVAILABLE'
  | 'REMOVED_CYCLE'
  | 'SOURCE_PERIOD_LOCKED';

export function moveCourseUseCase(
  cursos: Curso[],
  codigo: string,
  periodo: PeriodoAcademico,
  contexto: {
    cicloActual?: number | null; periodoIngreso?: PeriodoIngreso | null; ciclosExcluidos?: number[];
    horasSinRecargo?: number | null;
  } = {}
) {
  const curso = cursos.find((item) => item.codigo === codigo);
  if (!curso) return { ok: false as const, reason: 'NOT_FOUND' as MoveCourseFailureReason };
  if (periodo.tipo === 'REGULAR' && contexto.ciclosExcluidos?.includes(periodo.cicloReferencia)) {
    return { ok: false as const, reason: 'REMOVED_CYCLE' as MoveCourseFailureReason };
  }
  if (cursoBloqueado(curso)) {
    return { ok: false as const, reason: 'LOCKED' as MoveCourseFailureReason };
  }

  if (contexto.cicloActual && curso.ubicacion === 'periodo' &&
      periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), contexto.cicloActual)) {
    return { ok: false as const, reason: 'SOURCE_PERIOD_LOCKED' as MoveCourseFailureReason };
  }

  if (periodo.tipo === 'VERANO' && contexto.periodoIngreso &&
      !permiteVeranoDespuesDe(periodo.cicloReferencia, contexto.periodoIngreso)) {
    return { ok: false as const, reason: 'SUMMER_NOT_AVAILABLE' as MoveCourseFailureReason };
  }

  const periodoValido = validarDestinoNoAnterior(cursos, periodo, contexto.cicloActual);
  if (!periodoValido.valido) {
    return {
      ok: false as const,
      reason: (periodoValido.esPeriodoActualBloqueado
        ? 'CURRENT_PERIOD'
        : 'PAST_PERIOD') as MoveCourseFailureReason,
      periodoActual: periodoValido.periodoActual,
    };
  }

  const validation = validarPrerequisitosParaPeriodo(curso, cursos, periodo);
  if (!validation.valido) {
    return {
      ok: false as const,
      reason: 'PREREQUISITES' as MoveCourseFailureReason,
      faltantes: validation.faltantes,
    };
  }

  const cursosDestino = cursos
    .filter((item) => {
      if (item.codigo === codigo) return false;
      if (item.ubicacion !== 'periodo') return false;
      if (item.estado !== 'PENDIENTE' && item.estado !== 'EN_CURSO') return false;
      return obtenerPeriodoCurso(item).id === periodo.id;
    })
    .concat(curso);

  if (periodo.tipo === 'VERANO') {
    const creditos = validarLimiteCreditosVerano(cursosDestino);
    if (!creditos.valido) {
      return {
        ok: false as const,
        reason: 'SUMMER_CREDIT_LIMIT' as MoveCourseFailureReason,
        total: creditos.total,
        limite: creditos.limite,
      };
    }
  }

  const horas = validarLimiteHorasPeriodo(cursosDestino, periodo.tipo);
  const recargo = validarRecargoHorasPeriodo(cursosDestino, periodo.tipo, contexto.horasSinRecargo ?? null);
  return {
    ok: true as const,
    warning: !horas.valido ? {
      reason: 'HOUR_LIMIT' as const,
      total: horas.total,
      limite: horas.limite,
    } : null,
    surcharge: recargo && !recargo.valido ? {
      total: recargo.total,
      limite: recargo.limite,
    } : null,
    cursos: cursos.map((item) =>
      item.codigo === codigo
        ? {
            ...item,
            ciclo: periodo.cicloReferencia,
            tipoPeriodo: periodo.tipo,
            ubicacion: 'periodo' as const,
          }
        : item
    ),
  };
}
