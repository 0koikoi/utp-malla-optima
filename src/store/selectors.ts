// Selectores derivados del store
// Funciones que calculan datos derivados del estado (memoizables con useShallow)

import { useShallow } from 'zustand/react/shallow';
import { usePlannerStore } from './plannerStore';
import { calcularFinanzasCiclo, calcularCreditosElectivos } from '@/utils/finance';
import { calcularCicloActual } from '@/utils/cicloHelper';
import type { Curso, FinanzasCiclo, TipoPeriodo, CursoEnPlanificador } from '@/core/types';

/** Cursos ubicados en un ciclo específico */
export function useCursosPorUbicacion(ubicacion: string): Curso[] {
  const { cursos, asignaciones } = usePlannerStore(
    useShallow((s) => ({ cursos: s.cursos, asignaciones: s.asignaciones }))
  );
  return Object.values(cursos).filter((c) => asignaciones[c.codigo] === ubicacion);
}

/** Cursos en el pozo (pendientes sin asignar) */
export function useCursosPozo(): Curso[] {
  const { cursos, asignaciones } = usePlannerStore(
    useShallow((s) => ({ cursos: s.cursos, asignaciones: s.asignaciones }))
  );
  return Object.values(cursos)
    .filter((c) => c.estado === 'PENDIENTE' && asignaciones[c.codigo] === 'pozo')
    .sort((a, b) => a.cicloOrigen - b.cicloOrigen);
}

/** 
 * Calcula el ciclo lectivo real/activo del estudiante.
 */
export function useCicloActual(): number {
  return usePlannerStore((s) => calcularCicloActual(s.cursos));
}

/** Finanzas calculadas de todos los ciclos visibles */
export function useFinanzasCiclos(): FinanzasCiclo[] {
  const {
    cursos,
    asignaciones,
    facultad,
    metodoPago,
    cicloInicio,
    cicloFin,
    veranoActivo,
    cantVeranos,
    periodoIngreso,
    veranoUbicaciones,
    veranosHabilitados,
  } = usePlannerStore(
    useShallow((s) => ({
      cursos: s.cursos,
      asignaciones: s.asignaciones,
      facultad: s.facultad,
      metodoPago: s.metodoPago,
      cicloInicio: s.cicloInicio,
      cicloFin: s.cicloFin,
      veranoActivo: s.veranoActivo,
      cantVeranos: s.cantVeranos,
      periodoIngreso: s.periodoIngreso,
      veranoUbicaciones: s.veranoUbicaciones,
      veranosHabilitados: s.veranosHabilitados,
    }))
  );

  const finanzas: FinanzasCiclo[] = [];

  // Ciclos regulares visibles
  for (let i = cicloInicio; i <= cicloFin; i++) {
    const cicloId = `ciclo-${i}`;
    const cursosEnCiclo = Object.values(cursos).filter(
      (c) => asignaciones[c.codigo] === cicloId && c.estado === 'PENDIENTE'
    );
    finanzas.push(calcularFinanzasCiclo(cicloId, cursosEnCiclo, facultad, metodoPago, false));
  }

  // Ciclos de verano visibles: únicamente los que faltan planificar y que estén habilitados
  if (veranoActivo) {
    const cicloActual = calcularCicloActual(cursos);
    for (let v = 1; v <= cantVeranos; v++) {
      const estaHabilitado = veranosHabilitados?.[v] !== false;
      const trasCiclo = veranoUbicaciones?.[v] ?? (periodoIngreso === 'agosto' ? (v * 2 - 1) : (v * 2));
      const esFuturo = trasCiclo >= cicloActual;

      if (estaHabilitado && esFuturo) {
        const cicloId = `verano-${v}`;
        const cursosEnVerano = Object.values(cursos).filter(
          (c) => asignaciones[c.codigo] === cicloId && c.estado === 'PENDIENTE'
        );
        finanzas.push(calcularFinanzasCiclo(cicloId, cursosEnVerano, facultad, metodoPago, true));
      }
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
  const { cursos, asignaciones } = usePlannerStore(
    useShallow((s) => ({ cursos: s.cursos, asignaciones: s.asignaciones }))
  );
  return calcularCreditosElectivos(cursos, asignaciones);
}

/** Cuenta de cursos pendientes en el pozo */
export function useContadorPozo(): number {
  const { cursos, asignaciones } = usePlannerStore(
    useShallow((s) => ({ cursos: s.cursos, asignaciones: s.asignaciones }))
  );
  return Object.values(cursos).filter(
    (c) => c.estado === 'PENDIENTE' && asignaciones[c.codigo] === 'pozo'
  ).length;
}

/** Convierte el mapa de cursos y asignaciones en un array enriquecido para componentes legacy */
export function useCursosAcademicArray(): CursoEnPlanificador[] {
  const { cursos, asignaciones } = usePlannerStore(
    useShallow((s) => ({ cursos: s.cursos, asignaciones: s.asignaciones }))
  );
  
  return Object.values(cursos).map((curso) => {
    const asig = asignaciones[curso.codigo] ?? 'pozo';
    let ciclo = curso.cicloOrigen;
    let tipoPeriodo: TipoPeriodo = 'REGULAR';
    let ubicacion: 'banco' | 'periodo' = 'banco';

    if (asig === 'pozo') {
      ubicacion = 'banco';
      tipoPeriodo = 'REGULAR';
      ciclo = curso.cicloOrigen;
    } else if (asig.startsWith('verano-')) {
      ubicacion = 'periodo';
      tipoPeriodo = 'VERANO';
      ciclo = parseInt(asig.replace('verano-', ''), 10) || curso.cicloOrigen;
    } else if (asig.startsWith('ciclo-')) {
      ubicacion = 'periodo';
      tipoPeriodo = 'REGULAR';
      ciclo = parseInt(asig.replace('ciclo-', ''), 10) || curso.cicloOrigen;
    }

    const horasSemanales =
      typeof curso.horasSemanales === 'number' && !Number.isNaN(curso.horasSemanales)
        ? curso.horasSemanales
        : (Number((curso as any).horas) || Number((curso as any).horasTeoria ?? 0) + Number((curso as any).horasPractica ?? 0)) || 0;

    const creditos =
      typeof curso.creditos === 'number' && !Number.isNaN(curso.creditos)
        ? curso.creditos
        : 0;

    return {
      ...curso,
      ciclo,
      cicloOrigen: curso.cicloOrigen,
      tipoPeriodo,
      ubicacion,
      creditos,
      horasSemanales,
      prerrequisitos: curso.prerequisitos ?? [],
      habilitaA: curso.habilitaA ?? [],
    } as CursoEnPlanificador;
  });
}
