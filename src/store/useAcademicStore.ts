/**
 * @deprecated — TRANSITIONAL SHIM (Fase 2)
 *
 * useAcademicStore.ts es un store Zustand nativo que actúa como puente/adaptador
 * bidireccional reactivo con `plannerStore`.
 *
 * Al ser un store Zustand nativo:
 *   - Posee estabilidad referencial de snapshot nativa (elimina bucles de render en React 19).
 *   - Se suscribe a `plannerStore` y se actualiza reactivamente ante cualquier cambio.
 *   - Todas sus acciones delegan directamente a `plannerStore.getState()`.
 *   - Mapea de forma transparente el diccionario de cursos y asignaciones a `CursoEnPlanificador[]`.
 *
 * Migrar importadores en fases posteriores a:
 *   import { usePlannerStore } from '@/store/plannerStore';
 */

import { create } from 'zustand';
import { usePlannerStore, type PlannerState } from './plannerStore';
import { generateOptimalPlanUseCase } from '@/application/usecases/generateOptimalPlanUseCase';
import type {
  CursoEnPlanificador,
  Curso,
  EstadoCurso,
  NotificacionMovimiento,
  PeriodoAcademico,
  Tarifario,
  UbicacionCurso,
} from '@/core/types';

export interface AcademicStore {
  cursos: CursoEnPlanificador[];
  tarifario: Tarifario | null;
  disciplinaActiva: string;
  cursosSeleccionadosParaMatricula: string[];
  panelPlanificadorAbierto: boolean;
  cursoAMover: string | null;
  notificacionMovimiento: NotificacionMovimiento | null;
  nombreArchivoCargado: string | null;

  sincronizarConMalla: (cursosMap?: Record<string, any>, asignaciones?: Record<string, string>) => void;
  setCursos: (cursos: Curso[] | CursoEnPlanificador[] | Record<string, Curso>, nombreArchivo?: string) => Promise<void>;
  updateEstadoCurso: (codigo: string, estado: EstadoCurso) => Promise<void>;
  moverCursoAPeriodo: (codigo: string, periodo: PeriodoAcademico | any) => Promise<boolean>;
  moverCursoACiclo: (codigo: string, nuevoCiclo: number) => Promise<boolean>;
  moverCursoAVerano: (codigo: string, despuesDelCiclo: number) => Promise<boolean>;
  moverCursoABanco: (codigo: string) => Promise<boolean>;
  reiniciarPlanificacion: () => Promise<void>;
  generarPlanificacionOptima: () => Promise<any>;
  toggleSeleccionMatricula: (codigo: string) => void;
  setTarifario: (tarifario: Tarifario) => Promise<void>;
  setDisciplinaActiva: (disciplina: string) => Promise<void>;
  setPanelPlanificadorAbierto: (abierto: boolean) => void;
  setCursoAMover: (codigo: string | null) => void;
  limpiarNotificacionMovimiento: () => void;
  cargarDesdeDB: () => Promise<void>;
  importarCursos: (cursos: CursoEnPlanificador[]) => Promise<void>;
}

/**
 * Convierte el diccionario canónico de cursos y asignaciones de `plannerStore`
 * en el array `CursoEnPlanificador[]` que esperan los componentes legacy.
 */
export function cursosRecordToAcademicArray(
  cursosMap: Record<string, Curso>,
  asignaciones: Record<string, UbicacionCurso>
): CursoEnPlanificador[] {
  return Object.values(cursosMap).map((curso) => {
    const asig = asignaciones[curso.codigo] ?? 'pozo';
    let ciclo = curso.cicloOrigen;
    let tipoPeriodo: 'REGULAR' | 'VERANO' = 'REGULAR';
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
        : (Number((curso as any).horasTeoria ?? 0) + Number((curso as any).horasPractica ?? 0)) || 0;

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

// ─── Cache referencial para cursos ───────────────────────────────────────────

let lastCursosRef: Record<string, Curso> | null = null;
let lastAsignacionesRef: Record<string, UbicacionCurso> | null = null;
let cachedCursosArray: CursoEnPlanificador[] = [];

export function getCachedCursosArray(
  cursosMap: Record<string, Curso>,
  asignaciones: Record<string, UbicacionCurso>
): CursoEnPlanificador[] {
  if (lastCursosRef === cursosMap && lastAsignacionesRef === asignaciones) {
    return cachedCursosArray;
  }
  lastCursosRef = cursosMap;
  lastAsignacionesRef = asignaciones;
  cachedCursosArray = cursosRecordToAcademicArray(cursosMap, asignaciones);
  return cachedCursosArray;
}

// ─── Acciones estables compartidas que delegan en plannerStore ────────────────

const createAcademicActions = () => ({
  sincronizarConMalla: (_cursosMap?: Record<string, any>, _asignaciones?: Record<string, string>) => {
    // No-op: ambos mundos leen y escriben sobre el plannerStore unificado.
  },

  setCursos: async (nuevosCursos: Curso[] | CursoEnPlanificador[] | Record<string, Curso>, nombreArchivo?: string) => {
    let map: Record<string, Curso> = {};
    if (Array.isArray(nuevosCursos)) {
      for (const c of nuevosCursos) {
        map[c.codigo] = c;
      }
    } else {
      map = nuevosCursos;
    }
    usePlannerStore.getState().setCursos(map, nombreArchivo ?? '');
  },

  updateEstadoCurso: async (codigo: string, nuevoEstado: EstadoCurso) => {
    const state = usePlannerStore.getState();
    const actual = state.cursos[codigo];
    if (!actual) return;
    usePlannerStore.setState({
      cursos: {
        ...state.cursos,
        [codigo]: { ...actual, estado: nuevoEstado },
      },
    });
  },

  moverCursoAPeriodo: async (codigo: string, periodo: PeriodoAcademico | any) => {
    let destino: UbicacionCurso;
    const p = periodo as any;
    if (typeof p?.id === 'string' && (p.id.startsWith('ciclo-') || p.id.startsWith('verano-'))) {
      destino = p.id as UbicacionCurso;
    } else if (p?.tipo === 'VERANO') {
      const num = p.despuesDelCiclo ?? p.cicloReferencia ?? p.numero ?? 1;
      destino = `verano-${num}` as UbicacionCurso;
    } else {
      const num = p?.cicloReferencia ?? p?.numero ?? 1;
      destino = `ciclo-${num}` as UbicacionCurso;
    }
    return usePlannerStore.getState().ejecutarMovimiento(codigo, destino);
  },

  moverCursoACiclo: async (codigo: string, nuevoCiclo: number) => {
    return usePlannerStore.getState().ejecutarMovimiento(codigo, `ciclo-${nuevoCiclo}` as UbicacionCurso);
  },

  moverCursoAVerano: async (codigo: string, despuesDelCiclo: number) => {
    return usePlannerStore.getState().ejecutarMovimiento(codigo, `verano-${despuesDelCiclo}` as UbicacionCurso);
  },

  moverCursoABanco: async (codigo: string) => {
    return usePlannerStore.getState().ejecutarMovimiento(codigo, 'pozo');
  },

  reiniciarPlanificacion: async () => {
    usePlannerStore.getState().resetAsignaciones();
  },

  generarPlanificacionOptima: async () => {
    const { cursos, tarifario } = useAcademicStore.getState();
    const totalCiclos = cursos.reduce(
      (mayor: number, curso: CursoEnPlanificador) => Math.max(mayor, curso.cicloOrigen || curso.ciclo || 1),
      1
    );

    const resultado = generateOptimalPlanUseCase({
      cursos,
      limiteCreditos: tarifario?.limitesAcademicos?.creditosMaximos,
      totalCiclos,
    });

    return resultado;
  },

  toggleSeleccionMatricula: (codigo: string) => {
    usePlannerStore.getState().toggleSeleccionMatricula(codigo);
  },

  setTarifario: async (tarifario: Tarifario) => {
    usePlannerStore.getState().setTarifario(tarifario);
  },

  setDisciplinaActiva: async (disciplina: string) => {
    usePlannerStore.getState().setDisciplinaActiva(disciplina);
  },

  setPanelPlanificadorAbierto: (abierto: boolean) => {
    usePlannerStore.getState().setPanelPlanificadorAbierto(abierto);
  },

  setCursoAMover: (codigo: string | null) => {
    usePlannerStore.getState().setCursoAMover(codigo);
  },

  limpiarNotificacionMovimiento: () => {
    usePlannerStore.getState().limpiarNotificacionMovimiento();
  },

  cargarDesdeDB: async () => {
    // No-op: los datos persisten automáticamente en localStorage mediante plannerStore.
  },

  importarCursos: async (cursosImportados: CursoEnPlanificador[]) => {
    const map: Record<string, Curso> = {};
    for (const c of cursosImportados) {
      map[c.codigo] = c;
    }
    usePlannerStore.getState().setCursos(map, 'avance_academico.json');
  },
});

function getInitialState(planner: PlannerState) {
  return {
    cursos: getCachedCursosArray(planner.cursos, planner.asignaciones),
    tarifario: planner.tarifario,
    disciplinaActiva: planner.disciplinaActiva,
    cursosSeleccionadosParaMatricula: planner.cursosSeleccionadosParaMatricula,
    panelPlanificadorAbierto: planner.panelPlanificadorAbierto,
    cursoAMover: planner.cursoAMover,
    notificacionMovimiento: planner.notificacionMovimiento,
    nombreArchivoCargado: planner.nombreArchivoCargado,
  };
}

// ─── Store nativo Zustand para useAcademicStore ───────────────────────────────

const actions = createAcademicActions();
const initialPlanner = usePlannerStore.getState();

export const useAcademicStore = create<AcademicStore>(() => ({
  ...getInitialState(initialPlanner),
  ...actions,
}));

// Sincronización reactiva unidireccional automática:
// Cualquier cambio en `plannerStore` actualiza atómicamente el estado de `useAcademicStore`
usePlannerStore.subscribe((planner) => {
  const current = useAcademicStore.getState();
  const nextCursos = getCachedCursosArray(planner.cursos, planner.asignaciones);

  // Solo llamar setState si alguna propiedad cambió
  if (
    current.cursos !== nextCursos ||
    current.tarifario !== planner.tarifario ||
    current.disciplinaActiva !== planner.disciplinaActiva ||
    current.cursosSeleccionadosParaMatricula !== planner.cursosSeleccionadosParaMatricula ||
    current.panelPlanificadorAbierto !== planner.panelPlanificadorAbierto ||
    current.cursoAMover !== planner.cursoAMover ||
    current.notificacionMovimiento !== planner.notificacionMovimiento ||
    current.nombreArchivoCargado !== planner.nombreArchivoCargado
  ) {
    useAcademicStore.setState({
      cursos: nextCursos,
      tarifario: planner.tarifario,
      disciplinaActiva: planner.disciplinaActiva,
      cursosSeleccionadosParaMatricula: planner.cursosSeleccionadosParaMatricula,
      panelPlanificadorAbierto: planner.panelPlanificadorAbierto,
      cursoAMover: planner.cursoAMover,
      notificacionMovimiento: planner.notificacionMovimiento,
      nombreArchivoCargado: planner.nombreArchivoCargado,
    });
  }
});

// ─── Helpers exportados para retrocompatibilidad ──────────────────────────────

export function sincronizarConMalla(
  _cursosMap?: Record<string, any>,
  _asignaciones?: Record<string, string>
): void {
  // No-op en Fase 2
}

export function moverCursoABancoLegacy(codigo: string): boolean {
  return usePlannerStore.getState().ejecutarMovimiento(codigo, 'pozo');
}

export async function setCursosLegacy(
  cursos: CursoEnPlanificador[],
  nombreArchivo?: string
): Promise<void> {
  const map: Record<string, Curso> = {};
  for (const c of cursos) {
    map[c.codigo] = c;
  }
  usePlannerStore.getState().setCursos(map, nombreArchivo ?? '');
}
