// Store global con Zustand + persistencia automática en localStorage
// Maneja el estado completo del planificador

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Curso, UbicacionCurso } from '@/types/malla';
import type { FacultadKey, DescuentoKey } from '@/data/tarifario';

interface MallaState {
  // ── Datos de la malla (del xlsx) ─────────────────────────────────
  cursos: Record<string, Curso>;

  /** Ubicación de cada curso: qué ciclo/verano/pozo tiene asignado */
  asignaciones: Record<string, UbicacionCurso>;

  // ── Configuración del simulador ───────────────────────────────────
  facultad: FacultadKey;
  descuento: DescuentoKey;
  cicloInicio: number;
  cicloFin: number;
  veranoActivo: boolean;
  cantVeranos: number;

  // ── Metadata UI ──────────────────────────────────────────────────
  /** Nombre del archivo xlsx cargado (para mostrarlo en el botón upload) */
  nombreArchivoCargado: string | null;

  // ── Acciones ─────────────────────────────────────────────────────
  setCursos: (cursos: Record<string, Curso>, nombreArchivo: string) => void;
  restaurarMalla: (cursos: Record<string, Curso>, nombreArchivo: string) => void;
  setAsignacion: (codigoCurso: string, ubicacion: UbicacionCurso) => void;
  moverCurso: (codigoCurso: string, destino: UbicacionCurso) => void;
  resetAsignaciones: () => void;

  setFacultad: (facultad: FacultadKey) => void;
  setDescuento: (descuento: DescuentoKey) => void;
  setCicloInicio: (ciclo: number) => void;
  setCicloFin: (ciclo: number) => void;
  setVeranoActivo: (activo: boolean) => void;
  setCantVeranos: (cant: number) => void;
}

export const useMallaStore = create<MallaState>()(
  persist(
    (set) => ({
      // ── Estado inicial ──────────────────────────────────────────
      cursos: {},
      asignaciones: {},
      facultad: 'ingenieria',
      descuento: 'scotiabank',
      cicloInicio: 1,
      cicloFin: 10,
      veranoActivo: false,
      cantVeranos: 3,
      nombreArchivoCargado: null,

      // ── Acciones ────────────────────────────────────────────────

      /** Carga una nueva malla (subida de nuevo archivo) y reinicia todas las asignaciones */
      setCursos: (cursos, nombreArchivo) => {
        const asignaciones: Record<string, UbicacionCurso> = {};
        for (const curso of Object.values(cursos)) {
          const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
          asignaciones[curso.codigo] = esAprobado
            ? (`ciclo-${curso.cicloOrigen}` as UbicacionCurso)
            : 'pozo';
        }
        set({ cursos, asignaciones, nombreArchivoCargado: nombreArchivo });
      },

      /** Restaura la malla desde localStorage preservando la planificación previa del usuario */
      restaurarMalla: (cursos, nombreArchivo) => {
        set((state) => {
          const asignacionesActuales = state.asignaciones || {};
          const asignacionesFinales: Record<string, UbicacionCurso> = {};

          for (const curso of Object.values(cursos)) {
            if (asignacionesActuales[curso.codigo]) {
              asignacionesFinales[curso.codigo] = asignacionesActuales[curso.codigo];
            } else {
              const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
              asignacionesFinales[curso.codigo] = esAprobado
                ? (`ciclo-${curso.cicloOrigen}` as UbicacionCurso)
                : 'pozo';
            }
          }
          return {
            cursos,
            asignaciones: asignacionesFinales,
            nombreArchivoCargado: state.nombreArchivoCargado || nombreArchivo,
          };
        });
      },

      setAsignacion: (codigoCurso, ubicacion) =>
        set((state) => ({
          asignaciones: { ...state.asignaciones, [codigoCurso]: ubicacion },
        })),

      moverCurso: (codigoCurso, destino) =>
        set((state) => ({
          asignaciones: { ...state.asignaciones, [codigoCurso]: destino },
        })),

      /** Mueve todos los cursos PENDIENTES de los ciclos de vuelta al pozo */
      resetAsignaciones: () =>
        set((state) => {
          const nuevasAsignaciones = { ...state.asignaciones };
          for (const [codigo, ubicacion] of Object.entries(nuevasAsignaciones)) {
            const curso = state.cursos[codigo];
            if (!curso) continue;
            const esPendiente = curso.estado === 'PENDIENTE';
            const estaEnCiclo = ubicacion !== 'pozo';
            if (esPendiente && estaEnCiclo) {
              nuevasAsignaciones[codigo] = 'pozo';
            }
          }
          return { asignaciones: nuevasAsignaciones };
        }),

      setFacultad: (facultad) => set({ facultad }),
      setDescuento: (descuento) => set({ descuento }),
      setCicloInicio: (ciclo) => set({ cicloInicio: ciclo }),
      setCicloFin: (ciclo) => set({ cicloFin: ciclo }),
      setVeranoActivo: (activo) => set({ veranoActivo: activo }),
      setCantVeranos: (cant) => set({ cantVeranos: cant }),
    }),
    {
      name: 'malla_asignaciones', // key en localStorage (distinto de 'malla_data')
      storage: createJSONStorage(() => localStorage),
      // Persistir configuración, asignaciones y nombre del archivo
      partialize: (state) => ({
        asignaciones: state.asignaciones,
        facultad: state.facultad,
        descuento: state.descuento,
        cicloInicio: state.cicloInicio,
        cicloFin: state.cicloFin,
        veranoActivo: state.veranoActivo,
        cantVeranos: state.cantVeranos,
        nombreArchivoCargado: state.nombreArchivoCargado,
      }),
    }
  )
);
