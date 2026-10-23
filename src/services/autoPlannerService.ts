// autoPlannerService.ts — Servicio de optimización curricular automática (integrado de dev)
// Utiliza análisis de grafo de precedencias e impacto futuro + optimización por programación dinámica (Mochila 0/1)

import type { Curso, UbicacionCurso } from '@/types/malla';

export interface PlanificacionResumen {
  ciclosModificados: number;
  cursosAsignados: number;
  cursosNoUbicados: string[];
}

/** Construye el mapa de dependientes (habilitaA) */
function construirGrafoDependencias(cursos: Record<string, Curso>): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const c of Object.values(cursos)) {
    mapa.set(c.codigo, []);
  }
  for (const c of Object.values(cursos)) {
    for (const pre of c.prerequisitos) {
      const deps = mapa.get(pre);
      if (deps) deps.push(c.codigo);
    }
  }
  return mapa;
}

/** Calcula el impacto futuro: cuántos cursos aguas abajo desbloquea este curso */
export function calcularImpactoFuturo(codigo: string, cursos: Record<string, Curso>): number {
  const grafo = construirGrafoDependencias(cursos);
  const visitados = new Set<string>();

  function recorrer(act: string) {
    const hijos = grafo.get(act) ?? [];
    for (const h of hijos) {
      if (!visitados.has(h)) {
        visitados.add(h);
        recorrer(h);
      }
    }
  }

  recorrer(codigo);
  return visitados.size;
}

/** Comprueba si todos los prerrequisitos de un curso se cumplen antes de un ciclo destino */
function prerrequisitoCumplidoAntesDe(
  curso: Curso,
  cicloDestino: number,
  cursos: Record<string, Curso>,
  asignaciones: Map<string, number>
): boolean {
  for (const codigoPre of curso.prerequisitos) {
    const pre = cursos[codigoPre];
    if (!pre) continue; // nivelación o no mapeado
    if (['APROBADO', 'CONVALIDADO'].includes(pre.estado)) continue;
    const cicloAsig = asignaciones.get(pre.codigo);
    if (cicloAsig === undefined || cicloAsig >= cicloDestino) return false;
  }
  return true;
}

interface OpcionMochila {
  cursos: Curso[];
  creditos: number;
  impacto: number;
  cantidad: number;
}

/**
 * Selecciona la combinación de cursos con mayor impacto académico sin exceder el límite de créditos.
 * Programación dinámica (DP) adaptada del servicio de semestre de dev.
 */
function optimizarSemestre(
  disponibles: Curso[],
  maxCreditos: number,
  cursos: Record<string, Curso>
): Curso[] {
  if (disponibles.length === 0 || maxCreditos <= 0) return [];

  const ESCALA = 10;
  const limite = Math.max(0, Math.round(maxCreditos * ESCALA));
  const dp = new Map<number, OpcionMochila>();
  dp.set(0, { cursos: [], creditos: 0, impacto: 0, cantidad: 0 });

  for (const c of disponibles) {
    const peso = Math.max(0, Math.round(c.creditos * ESCALA));
    const impactoCurso = calcularImpactoFuturo(c.codigo, cursos);
    const estados = [...dp.entries()].sort((a, b) => b[0] - a[0]);

    for (const [creditosUsados, opcion] of estados) {
      const nuevoPeso = creditosUsados + peso;
      if (nuevoPeso > limite) continue;

      const candidata: OpcionMochila = {
        cursos: [...opcion.cursos, c],
        creditos: opcion.creditos + c.creditos,
        impacto: opcion.impacto + impactoCurso,
        cantidad: opcion.cantidad + 1,
      };

      const actual = dp.get(nuevoPeso);
      let esMejor = false;
      if (!actual) {
        esMejor = true;
      } else if (candidata.impacto !== actual.impacto) {
        esMejor = candidata.impacto > actual.impacto;
      } else if (candidata.cantidad !== actual.cantidad) {
        esMejor = candidata.cantidad > actual.cantidad;
      } else {
        esMejor = candidata.creditos > actual.creditos;
      }

      if (esMejor) {
        dp.set(nuevoPeso, candidata);
      }
    }
  }

  let mejor: OpcionMochila = { cursos: [], creditos: 0, impacto: 0, cantidad: 0 };
  for (const opcion of dp.values()) {
    if (
      opcion.impacto > mejor.impacto ||
      (opcion.impacto === mejor.impacto && opcion.creditos > mejor.creditos)
    ) {
      mejor = opcion;
    }
  }

  return mejor.cursos;
}

/**
 * Genera una ruta curricular automática para todos los cursos PENDIENTE a partir del ciclo activo.
 * Respeta rigurosamente:
 * 1. Ciclos concluidos / pasados (< cicloActual): no se alteran.
 * 2. Cursos ya aprobados: quedan intactos.
 * 3. Prerrequisitos de la malla UTP.
 * 4. Límite de créditos por ciclo (por defecto 22 créditos).
 */
export function generarPlanificacionOptima(
  cursos: Record<string, Curso>,
  asignacionesActuales: Record<string, UbicacionCurso>,
  cicloActual: number,
  cicloFin: number = 10,
  maxCreditosPorCiclo: number = 22
): { nuevasAsignaciones: Record<string, UbicacionCurso>; resumen: PlanificacionResumen } {
  const nuevasAsignaciones: Record<string, UbicacionCurso> = { ...asignacionesActuales };

  // Todos los cursos pendientes
  const cursosArr = Object.values(cursos);
  const pendientes = cursosArr.filter((c) => c.estado === 'PENDIENTE');
  const pendientesRestantes = new Map<string, Curso>(pendientes.map((c) => [c.codigo, c]));

  // Asignaciones en mapa numérico para ciclos activos/futuros
  const asignacionesCiclo = new Map<string, number>();

  let totalAsignados = 0;

  for (let ciclo = cicloActual; ciclo <= cicloFin && pendientesRestantes.size > 0; ciclo++) {
    // Filtrar cursos que ya tienen prerrequisitos cumplidos en ciclos anteriores
    const disponibles = [...pendientesRestantes.values()].filter((c) => {
      if (c.creditos > maxCreditosPorCiclo) return false;
      return prerrequisitoCumplidoAntesDe(c, ciclo, cursos, asignacionesCiclo);
    });

    if (disponibles.length === 0) continue;

    // Optimizar la selección para este ciclo maximizando impacto en descendientes
    const seleccionados = optimizarSemestre(disponibles, maxCreditosPorCiclo, cursos);
    if (seleccionados.length === 0) continue;

    for (const c of seleccionados) {
      asignacionesCiclo.set(c.codigo, ciclo);
      nuevasAsignaciones[c.codigo] = `ciclo-${ciclo}` as UbicacionCurso;
      pendientesRestantes.delete(c.codigo);
      totalAsignados++;
    }
  }

  // Los que no pudieron planificarse permanecen en el pozo
  const noUbicados: string[] = [];
  for (const [codigo, c] of pendientesRestantes.entries()) {
    nuevasAsignaciones[codigo] = 'pozo';
    noUbicados.push(c.nombre);
  }

  return {
    nuevasAsignaciones,
    resumen: {
      ciclosModificados: Math.max(0, cicloFin - cicloActual + 1),
      cursosAsignados: totalAsignados,
      cursosNoUbicados: noUbicados,
    },
  };
}
