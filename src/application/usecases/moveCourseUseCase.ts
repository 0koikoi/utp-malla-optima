import type { Curso, PeriodoAcademico } from '../../types/academic';
import { cursoBloqueado } from '../../domain/rules/courseRules';
import {
  validarDestinoNoAnterior,
  validarLimiteCreditosVerano,
  validarLimiteHorasPeriodo,
} from '../../domain/rules/planningRules';
import { validarPrerequisitosParaPeriodo } from '../../utils/academicGraph';
import { obtenerPeriodoCurso } from '../../domain/rules/academicPeriodRules';

export type MoveCourseFailureReason =
  | 'NOT_FOUND'
  | 'LOCKED'
  | 'PAST_PERIOD'
  | 'CURRENT_PERIOD'
  | 'PREREQUISITES'
  | 'SUMMER_CREDIT_LIMIT'
  | 'HOUR_LIMIT';

export function moveCourseUseCase(
  cursos: Curso[],
  codigo: string,
  periodo: PeriodoAcademico
) {
  const curso = cursos.find((item) => item.codigo === codigo);
  if (!curso) return { ok: false as const, reason: 'NOT_FOUND' as MoveCourseFailureReason };
  if (cursoBloqueado(curso)) {
    return { ok: false as const, reason: 'LOCKED' as MoveCourseFailureReason };
  }

  const periodoValido = validarDestinoNoAnterior(cursos, periodo);
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
  if (!horas.valido) {
    return {
      ok: false as const,
      reason: 'HOUR_LIMIT' as MoveCourseFailureReason,
      total: horas.total,
      limite: horas.limite,
    };
  }

  return {
    ok: true as const,
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
