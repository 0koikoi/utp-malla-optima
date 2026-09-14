import type { Curso } from '../../types/academic';
import { calcularImpactoFuturo } from './recommendationService';

export interface CursoOptimizado {
  cursos: Curso[];
  creditos: number;
  impacto: number;
}

interface OpcionDP extends CursoOptimizado {
  cantidad: number;
}

const ESCALA_CREDITOS = 10;

const esMejorOpcion = (candidata: OpcionDP, actual?: OpcionDP): boolean => {
  if (!actual) return true;
  if (candidata.impacto !== actual.impacto) return candidata.impacto > actual.impacto;
  if (candidata.cantidad !== actual.cantidad) return candidata.cantidad > actual.cantidad;
  return candidata.creditos > actual.creditos;
};

/**
 * Selecciona la combinación de cursos con mayor impacto académico posible sin
 * exceder el límite de créditos. El impacto siempre se calcula contra la malla
 * completa para no perder descendientes que todavía no están disponibles.
 */
export const optimizarSemestre = (
  cursosDisponibles: Curso[],
  maxCreditos: number,
  mallaCompleta: Curso[] = cursosDisponibles
): CursoOptimizado => {
  if (cursosDisponibles.length === 0 || maxCreditos <= 0) {
    return { cursos: [], creditos: 0, impacto: 0 };
  }

  const limite = Math.max(0, Math.round(maxCreditos * ESCALA_CREDITOS));
  const dp = new Map<number, OpcionDP>();
  dp.set(0, { cursos: [], creditos: 0, impacto: 0, cantidad: 0 });

  cursosDisponibles.forEach((curso) => {
    const peso = Math.max(0, Math.round(curso.creditos * ESCALA_CREDITOS));
    const impactoCurso = calcularImpactoFuturo(curso.codigo, mallaCompleta);
    const estados = [...dp.entries()].sort((a, b) => b[0] - a[0]);

    estados.forEach(([creditosUsados, opcion]) => {
      const nuevoPeso = creditosUsados + peso;
      if (nuevoPeso > limite) return;

      const candidata: OpcionDP = {
        cursos: [...opcion.cursos, curso],
        creditos: opcion.creditos + curso.creditos,
        impacto: opcion.impacto + impactoCurso,
        cantidad: opcion.cantidad + 1,
      };

      if (esMejorOpcion(candidata, dp.get(nuevoPeso))) {
        dp.set(nuevoPeso, candidata);
      }
    });
  });

  let mejor: OpcionDP = { cursos: [], creditos: 0, impacto: 0, cantidad: 0 };
  dp.forEach((opcion) => {
    if (esMejorOpcion(opcion, mejor)) mejor = opcion;
  });

  return {
    cursos: mejor.cursos,
    creditos: mejor.creditos,
    impacto: mejor.impacto,
  };
};
