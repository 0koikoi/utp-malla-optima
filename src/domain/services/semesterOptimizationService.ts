import type { Curso } from '../../types/academic';
import { calcularPrioridadesPendientes, type PrioridadPendiente } from './recommendationService';

export interface CursoOptimizado {
  cursos: Curso[];
  creditos: number;
  horas: number;
  impacto: number;
}

interface OpcionDP extends CursoOptimizado {
  longitud: number;
}

const ESCALA_HORAS = 1000;
const esMejorOpcion = (candidata: OpcionDP, actual?: OpcionDP): boolean => {
  if (!actual) return true;
  if (candidata.impacto !== actual.impacto) return candidata.impacto > actual.impacto;
  if (candidata.longitud !== actual.longitud) return candidata.longitud > actual.longitud;
  if (candidata.cursos.length !== actual.cursos.length) return candidata.cursos.length > actual.cursos.length;
  return candidata.horas > actual.horas;
};

/** Mochila por horas. Los créditos se suman únicamente para el resumen. */
export const optimizarSemestre = (
  cursosDisponibles: Curso[],
  maxHoras: number,
  prioridades: ReadonlyMap<string, PrioridadPendiente> = calcularPrioridadesPendientes(cursosDisponibles)
): CursoOptimizado => {
  const vacio: OpcionDP = { cursos: [], creditos: 0, horas: 0, impacto: 0, longitud: 0 };
  if (!Number.isFinite(maxHoras) || maxHoras <= 0) return vacio;

  const limite = Math.floor(maxHoras * ESCALA_HORAS);
  const dp = new Map<number, OpcionDP>([[0, vacio]]);
  for (const curso of cursosDisponibles) {
    if (!Number.isFinite(curso.horasSemanales) || curso.horasSemanales <= 0) continue;
    const peso = Math.ceil(curso.horasSemanales * ESCALA_HORAS - 1e-9);
    const prioridad = prioridades.get(curso.codigo);
    for (const [horasUsadas, opcion] of [...dp.entries()]) {
      const nuevoPeso = horasUsadas + peso;
      const horas = opcion.horas + curso.horasSemanales;
      if (nuevoPeso > limite || horas > maxHoras) continue;

      const candidata: OpcionDP = {
        cursos: [...opcion.cursos, curso],
        creditos: opcion.creditos + curso.creditos,
        horas,
        impacto: opcion.impacto + (prioridad?.impacto ?? 0),
        longitud: opcion.longitud + (prioridad?.longitudCadena ?? 1),
      };
      if (esMejorOpcion(candidata, dp.get(nuevoPeso))) dp.set(nuevoPeso, candidata);
    }
  }

  let mejor = vacio;
  for (const opcion of dp.values()) if (esMejorOpcion(opcion, mejor)) mejor = opcion;
  return { cursos: mejor.cursos, creditos: mejor.creditos, horas: mejor.horas, impacto: mejor.impacto };
};
