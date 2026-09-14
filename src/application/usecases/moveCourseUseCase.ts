import type { Curso } from '../../types/academic';
import { cursoBloqueado } from '../../domain/rules/courseRules';
import { validarPrerequisitosParaCiclo } from '../../utils/academicGraph';

export function moveCourseUseCase(cursos: Curso[], codigo: string, ciclo: number) {
  const curso = cursos.find(c => c.codigo === codigo);
  if (!curso) return { ok: false, reason: 'NOT_FOUND' };
  if (cursoBloqueado(curso)) return { ok: false, reason: 'LOCKED' };
  const validation = validarPrerequisitosParaCiclo(curso, cursos, ciclo);
  if (!validation.valido) return { ok: false, reason: 'PREREQUISITES', faltantes: validation.faltantes };
  return {
    ok: true,
    cursos: cursos.map(c => c.codigo === codigo ? {...c, ciclo, ubicacion:'ciclo'} : c)
  };
}
