// Selectores derivados del store
// Funciones que calculan datos derivados del estado (memoizables)

import { useMallaStore } from './mallaStore';
import { calcularFinanzasCiclo, calcularCreditosElectivos } from '@/utils/finance';
import type { Curso, FinanzasCiclo } from '@/types/malla';

/** Cursos ubicados en un ciclo específico */
export function useCursosPorUbicacion(ubicacion: string): Curso[] {
  const { cursos, asignaciones } = useMallaStore();
  return Object.values(cursos).filter((c) => asignaciones[c.codigo] === ubicacion);
}

/** Cursos en el pozo (pendientes sin asignar) */
export function useCursosPozo(): Curso[] {
  const { cursos, asignaciones } = useMallaStore();
  return Object.values(cursos)
    .filter((c) => c.estado === 'PENDIENTE' && asignaciones[c.codigo] === 'pozo')
    .sort((a, b) => a.cicloOrigen - b.cicloOrigen);
}

/** Calcula el ciclo "actual" del estudiante (el menor ciclo que aún tiene cursos pendientes) */
export function useCicloActual(): number {
  const cursos = useMallaStore((s) => s.cursos);
  const cursosArr = Object.values(cursos);
  
  if (cursosArr.length === 0) return 1;

  let minCiclo = 12;
  let hasPending = false;

  for (const curso of cursosArr) {
    if (curso.estado === 'PENDIENTE') {
      hasPending = true;
      if (curso.cicloOrigen < minCiclo) {
        minCiclo = curso.cicloOrigen;
      }
    }
  }
  
  return hasPending ? minCiclo : 12;
}

/** Finanzas calculadas de todos los ciclos visibles */
export function useFinanzasCiclos(): FinanzasCiclo[] {
  const { cursos, asignaciones, facultad, descuento, cicloInicio, cicloFin, veranoActivo, cantVeranos } =
    useMallaStore();

  const finanzas: FinanzasCiclo[] = [];

  // Ciclos regulares visibles
  for (let i = cicloInicio; i <= cicloFin; i++) {
    const cicloId = `ciclo-${i}`;
    const cursosEnCiclo = Object.values(cursos).filter(
      (c) => asignaciones[c.codigo] === cicloId && c.estado === 'PENDIENTE'
    );
    finanzas.push(calcularFinanzasCiclo(cicloId, cursosEnCiclo, facultad, descuento, false));
  }

  // Ciclos de verano visibles
  if (veranoActivo) {
    for (let v = 1; v <= cantVeranos; v++) {
      const cicloId = `verano-${v}`;
      const cursosEnVerano = Object.values(cursos).filter(
        (c) => asignaciones[c.codigo] === cicloId && c.estado === 'PENDIENTE'
      );
      finanzas.push(calcularFinanzasCiclo(cicloId, cursosEnVerano, facultad, descuento, true));
    }
  }

  return finanzas;
}

/** Cuota más alta entre todos los ciclos visibles */
export function useCuotaMaxima(): number {
  const finanzas = useFinanzasCiclos();
  return finanzas.reduce((max, f) => Math.max(max, f.costoFinal), 0);
}

/** Total de créditos electivos planificados/aprobados (para R3) */
export function useCreditosElectivos(): number {
  const { cursos, asignaciones } = useMallaStore();
  return calcularCreditosElectivos(cursos, asignaciones);
}

/** Cuenta de cursos pendientes en el pozo */
export function useContadorPozo(): number {
  const { cursos, asignaciones } = useMallaStore();
  return Object.values(cursos).filter(
    (c) => c.estado === 'PENDIENTE' && asignaciones[c.codigo] === 'pozo'
  ).length;
}
