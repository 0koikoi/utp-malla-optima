import type { Curso } from '../../types/academic';
import { calcularImpactoFuturo } from './recommendationService';

export interface CursoOptimizado {
  cursos: Curso[];
  creditos: number;
  impacto: number;
}

/**
 * Busca una combinación de cursos que maximice el impacto futuro
 * respetando un límite de créditos.
 */
export const optimizarSemestre = (
  cursosDisponibles: Curso[],
  maxCreditos: number
): CursoOptimizado => {
  let mejor: CursoOptimizado = {
    cursos: [],
    creditos: 0,
    impacto: 0,
  };

  const explorar = (
    indice: number,
    seleccionados: Curso[],
    creditos: number
  ) => {
    if (creditos > maxCreditos) return;

    const impacto = seleccionados.reduce(
      (total, curso) => total + calcularImpactoFuturo(curso.codigo, cursosDisponibles),
      0
    );

    if (impacto > mejor.impacto) {
      mejor = {
        cursos: [...seleccionados],
        creditos,
        impacto,
      };
    }

    for (let i = indice; i < cursosDisponibles.length; i++) {
      explorar(
        i + 1,
        [...seleccionados, cursosDisponibles[i]],
        creditos + cursosDisponibles[i].creditos
      );
    }
  };

  explorar(0, [], 0);

  return mejor;
};
