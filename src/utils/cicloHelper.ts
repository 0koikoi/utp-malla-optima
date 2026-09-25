// cicloHelper.ts — Lógica pura para determinar el ciclo lectivo real/activo del estudiante
import type { Curso } from '@/types/malla';

/**
 * Calcula el ciclo lectivo real/activo del estudiante a partir del estado de sus cursos.
 * 
 * 1. Agrupa los cursos por ciclo de origen (1..12).
 * 2. Un ciclo k se considera "concluido/histórico" si:
 *    a) Tiene todos sus cursos aprobados/convalidados (100% completado), O
 *    b) El alumno ya ha aprobado una masa significativa de cursos en ciclos superiores (> k),
 *       lo cual evidencia cronológicamente que el ciclo k ya fue cursado en el pasado
 *       (los pendientes que quedaron en k son cursos rezagados que se matricularán a futuro).
 *    c) Si en el ciclo k mismo ya aprobó la mayoría sustancial (≥3 cursos y ≥50%).
 * 3. El ciclo lectivo es el PRIMER ciclo regular que NO se considera concluido.
 */
export function calcularCicloActual(cursos: Record<string, Curso>): number {
  const cursosArr = Object.values(cursos);
  if (cursosArr.length === 0) return 1;

  const cursosPorCiclo: Record<number, { total: number; aprobados: number; pendientes: number }> = {};
  for (let c = 1; c <= 12; c++) {
    cursosPorCiclo[c] = { total: 0, aprobados: 0, pendientes: 0 };
  }

  for (const curso of cursosArr) {
    const c = curso.cicloOrigen;
    const entry = cursosPorCiclo[c] ?? (cursosPorCiclo[c] = { total: 0, aprobados: 0, pendientes: 0 });
    entry.total++;
    if (['APROBADO', 'CONVALIDADO'].includes(curso.estado)) {
      entry.aprobados++;
    } else if (curso.estado === 'PENDIENTE') {
      entry.pendientes++;
    }
  }

  for (let k = 1; k <= 10; k++) {
    const stats = cursosPorCiclo[k];
    if (!stats || stats.total === 0) continue;

    // Si completó todos los cursos del ciclo -> concluido
    if (stats.pendientes === 0 && stats.aprobados > 0) {
      continue;
    }

    // Aprobados en ciclos estrictamente posteriores (> k)
    let aprobadosPosteriores = 0;
    for (let post = k + 1; post <= 12; post++) {
      aprobadosPosteriores += cursosPorCiclo[post]?.aprobados || 0;
    }

    if (aprobadosPosteriores >= 3) {
      continue;
    }

    const porcentajeAprobado = stats.total > 0 ? stats.aprobados / stats.total : 0;
    if (stats.aprobados >= 3 && porcentajeAprobado >= 0.5) {
      continue;
    }

    return k;
  }

  return 10;
}
