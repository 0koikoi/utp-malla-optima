/**
 * plannerStore.ts — Store unificado del planificador (Fase 2)
 *
 * Fusiona mallaStore + useAcademicStore en un solo store Zustand con persist.
 * Los archivos legacy (mallaStore.ts, useAcademicStore.ts) se convierten en
 * shims de re-export apuntando a este módulo.
 *
 * Estructura de slices:
 *   curriculum → cursos, asignaciones, nombreArchivoCargado
 *   config     → facultad, descuento, cicloInicio, cicloFin,
 *                veranoActivo, cantVeranos, periodoIngreso, veranoUbicaciones,
 *                tarifario, disciplinaActiva
 *   ui         → bienvenidaModalOpen, configSidebarOpen, drawerMobOpen,
 *                menuMobOpen, panelPlanificadorAbierto
 *   feedback   → blockedInfo, cascadaAlerta, cursoAMover, cursosConPrereqRoto,
 *                notificacionMovimiento, cursosSeleccionadosParaMatricula
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Curso, UbicacionCurso, Tarifario, NotificacionMovimiento } from '@/core/types';
import type { FacultadKey } from '@/data/tarifario';
import {
  validarPrerequisitos,
  verificarRupturasEnCascada,
  obtenerTodosCursosRotos,
} from '@/utils/validators';
import { generarPlanificacionAutomatica, type ResultadoPlanificacionAutomatica } from '@/domain/services/automaticPlanningService';
import type { RespaldoMalla } from '@/adapters/backupAdapter';
import { FinancialConfigurationProvider } from '@/infrastructure/configuration/FinancialConfigurationProvider';

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export type PeriodoIngreso = 'marzo' | 'agosto';

// ─── Tipo del estado ──────────────────────────────────────────────────────────

export interface PlannerState {
  // ── Curriculum ──────────────────────────────────────────────────────────────
  cursos: Record<string, Curso>;
  asignaciones: Record<string, UbicacionCurso>;
  nombreArchivoCargado: string | null;

  // ── Config ──────────────────────────────────────────────────────────────────
  facultad: FacultadKey;
  metodoPago: string;
  cicloInicio: number;
  cicloFin: number;
  veranoActivo: boolean;
  cantVeranos: number;
  periodoIngreso: PeriodoIngreso;
  /** Mapa de a qué ciclo regular sigue cada verano (ej. 1: 2 → verano tras ciclo 2) */
  veranoUbicaciones: Record<number, number>;
  /** Mapa de qué periodos de verano están habilitados individualmente por el usuario */
  veranosHabilitados: Record<number, boolean>;
  /** Tarifario del motor financiero (dev) */
  tarifario: Tarifario;
  /** Disciplina activa para cálculo financiero */
  disciplinaActiva: string;

  // ── UI ───────────────────────────────────────────────────────────────────────
  bienvenidaModalOpen: boolean;
  configSidebarOpen: boolean;
  drawerMobOpen: boolean;
  menuMobOpen: boolean;
  panelPlanificadorAbierto: boolean;
  pestanaEstrategia: 'academico' | 'financiero';

  // ── Feedback ─────────────────────────────────────────────────────────────────
  blockedInfo: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null;
  cascadaAlerta: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null;
  cursoAMover: string | null;
  cursosConPrereqRoto: string[];
  notificacionMovimiento: NotificacionMovimiento | null;
  cursosSeleccionadosParaMatricula: string[];

  // ── Acciones Curriculum ───────────────────────────────────────────────────────
  setCursos: (cursos: Record<string, Curso>, nombreArchivo: string) => void;
  restaurarMalla: (cursos: Record<string, Curso>, nombreArchivo: string) => void;
  setAsignacion: (codigoCurso: string, ubicacion: UbicacionCurso) => void;
  moverCurso: (codigoCurso: string, destino: UbicacionCurso) => void;
  ejecutarMovimiento: (codigoCurso: string, destino: UbicacionCurso) => boolean;
  resetAsignaciones: () => void;
  autoPlanificar: () => ResultadoPlanificacionAutomatica | null;
  aplicarPlanAcademico: (academicCursos: any[]) => void;
  cargarRespaldo: (respaldo: RespaldoMalla) => void;
  exportarRespaldo: () => RespaldoMalla;

  // ── Acciones Config ────────────────────────────────────────────────────────
  setFacultad: (facultad: FacultadKey) => void;
  setMetodoPago: (metodo: string) => void;
  setCicloInicio: (ciclo: number) => void;
  setCicloFin: (ciclo: number) => void;
  setVeranoActivo: (activo: boolean) => void;
  setCantVeranos: (cant: number) => void;
  setPeriodoIngreso: (periodo: PeriodoIngreso) => void;
  setVeranoUbicacion: (veranoNum: number, trasCiclo: number) => void;
  toggleVeranoHabilitado: (veranoNum: number) => void;
  setVeranoHabilitado: (veranoNum: number, habilitado: boolean) => void;
  setTarifario: (tarifario: Tarifario) => void;
  setDisciplinaActiva: (disciplina: string) => void;

  // ── Acciones UI ────────────────────────────────────────────────────────────
  setBienvenidaModalOpen: (open: boolean) => void;
  setConfigSidebarOpen: (open: boolean) => void;
  setDrawerMobOpen: (open: boolean) => void;
  setMenuMobOpen: (open: boolean) => void;
  setPanelPlanificadorAbierto: (abierto: boolean) => void;
  setPestanaEstrategia: (pestana: 'academico' | 'financiero') => void;
  abrirEstrategia: (pestana?: 'academico' | 'financiero') => void;

  // ── Acciones Feedback ──────────────────────────────────────────────────────
  setBlockedInfo: (info: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null) => void;
  setCascadaAlerta: (alerta: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null) => void;
  setCursoAMover: (codigo: string | null) => void;
  setCursosConPrereqRoto: (codigos: string[]) => void;
  setNotificacionMovimiento: (notif: NotificacionMovimiento | null) => void;
  limpiarNotificacionMovimiento: () => void;
  toggleSeleccionMatricula: (codigo: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      // ── Estado inicial ────────────────────────────────────────────────────
      cursos: {},
      asignaciones: {},
      nombreArchivoCargado: null,

      facultad: 'ingenieria',
      metodoPago: 'sin_descuento',
      cicloInicio: 1,
      cicloFin: 12,
      veranoActivo: true,
      cantVeranos: 5,
      periodoIngreso: 'marzo',
      veranoUbicaciones: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 },
      veranosHabilitados: { 1: true, 2: true, 3: true, 4: true, 5: true },
      tarifario: FinancialConfigurationProvider.load(),
      disciplinaActiva: 'Ingeniería y Arquitectura',

      bienvenidaModalOpen:
        typeof window !== 'undefined' ? !localStorage.getItem('malla_modal_visto') : true,
      configSidebarOpen: false,
      drawerMobOpen: false,
      menuMobOpen: false,
      panelPlanificadorAbierto: false,
      pestanaEstrategia: 'academico',

      blockedInfo: null,
      cascadaAlerta: null,
      cursoAMover: null,
      cursosConPrereqRoto: [],
      notificacionMovimiento: null,
      cursosSeleccionadosParaMatricula: [],

      // ── Acciones Curriculum ───────────────────────────────────────────────

      /** Carga una nueva malla (subida de nuevo archivo) y reinicia todas las asignaciones */
      setCursos: (cursos, nombreArchivo) => {
        const asignaciones: Record<string, UbicacionCurso> = {};
        for (const curso of Object.values(cursos)) {
          const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
          asignaciones[curso.codigo] = esAprobado
            ? (`ciclo-${curso.cicloOrigen}` as UbicacionCurso)
            : 'pozo';
        }
        const maxOrigen =
          Object.values(cursos).length > 0
            ? Math.max(...Object.values(cursos).map((c) => c.cicloOrigen))
            : 12;
        set({
          cursos,
          asignaciones,
          nombreArchivoCargado: nombreArchivo,
          cicloInicio: 1,
          cicloFin: Math.max(12, maxOrigen),
          cursosConPrereqRoto: [],
          blockedInfo: null,
          cascadaAlerta: null,
          cursoAMover: null,
        });
      },

      /** Restaura la malla preservando la planificación previa del usuario */
      restaurarMalla: (cursos, nombreArchivo) => {
        set((state) => {
          const asignacionesActuales = state.asignaciones || {};
          const asignacionesFinales: Record<string, UbicacionCurso> = {};

          for (const curso of Object.values(cursos)) {
            const ubicacionActual = asignacionesActuales[curso.codigo];
            if (ubicacionActual) {
              asignacionesFinales[curso.codigo] = ubicacionActual;
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
            cicloInicio: state.cicloInicio ?? 1,
            cicloFin: Math.max(12, state.cicloFin ?? 12),
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

      /** Ejecuta el movimiento validando prerrequisitos y detectando rupturas en cascada */
      ejecutarMovimiento: (codigoCurso, destino) => {
        const state = get();
        const curso = state.cursos[codigoCurso];
        if (!curso) return false;

        // Si se devuelve al pozo → siempre permitido
        if (destino === 'pozo') {
          const rotos = verificarRupturasEnCascada(
            codigoCurso,
            'pozo',
            state.cursos,
            state.asignaciones,
            state.veranoUbicaciones
          );
          state.moverCurso(codigoCurso, 'pozo');
          const nuevosRotos = obtenerTodosCursosRotos(
            state.cursos,
            get().asignaciones,
            state.veranoUbicaciones
          );
          set({ cursosConPrereqRoto: nuevosRotos });
          if (rotos.length > 0) {
            set({
              cascadaAlerta: {
                cursoNombre: curso.nombre,
                faltantes: rotos.map((r) => ({
                  codigo: r.codigo,
                  nombre: `${r.nombre} (${r.ubicacion.replace('-', ' ')})`,
                })),
              },
            });
          }
          return true;
        }

        // Si se asigna a un ciclo → validar prerrequisitos
        const { valido, faltantes } = validarPrerequisitos(
          curso,
          state.cursos,
          state.asignaciones,
          destino,
          state.veranoUbicaciones
        );
        if (!valido) {
          set({ blockedInfo: { cursoNombre: curso.nombre, faltantes } });
          return false;
        }

        // Verificar rupturas en cascada
        const rotos = verificarRupturasEnCascada(
          codigoCurso,
          destino,
          state.cursos,
          state.asignaciones,
          state.veranoUbicaciones
        );
        state.moverCurso(codigoCurso, destino);
        const nuevosRotos = obtenerTodosCursosRotos(
          state.cursos,
          get().asignaciones,
          state.veranoUbicaciones
        );
        set({ cursosConPrereqRoto: nuevosRotos });
        if (rotos.length > 0) {
          set({
            cascadaAlerta: {
              cursoNombre: curso.nombre,
              faltantes: rotos.map((r) => ({
                codigo: r.codigo,
                nombre: `${r.nombre} (${r.ubicacion.replace('-', ' ')})`,
              })),
            },
          });
        }
        return true;
      },

      resetAsignaciones: () =>
        set((state) => {
          const nuevasAsignaciones = { ...state.asignaciones };
          for (const [codigo, ubicacion] of Object.entries(nuevasAsignaciones)) {
            const curso = state.cursos[codigo];
            if (!curso) continue;
            if (curso.estado === 'PENDIENTE' && ubicacion !== 'pozo') {
              nuevasAsignaciones[codigo] = 'pozo';
            }
          }
          return {
            asignaciones: nuevasAsignaciones,
            cursosConPrereqRoto: [],
            blockedInfo: null,
            cascadaAlerta: null,
            cursoAMover: null,
          };
        }),

      /** Genera automáticamente la planificación óptima desde el ciclo lectivo activo */
      autoPlanificar: () => {
        const state = get();
        if (Object.keys(state.cursos).length === 0) return null;
        
        const cursosArray = Object.values(state.cursos).map(curso => {
          const asig = state.asignaciones[curso.codigo] ?? 'pozo';
          let ciclo = curso.cicloOrigen;
          let tipoPeriodo: 'REGULAR' | 'VERANO' = 'REGULAR';
          let ubicacion: 'banco' | 'periodo' = 'banco';

          if (asig === 'pozo') {
            ubicacion = 'banco';
          } else if (asig.startsWith('verano-')) {
            ubicacion = 'periodo';
            tipoPeriodo = 'VERANO';
            ciclo = parseInt(asig.replace('verano-', ''), 10) || curso.cicloOrigen;
          } else if (asig.startsWith('ciclo-')) {
            ubicacion = 'periodo';
            ciclo = parseInt(asig.replace('ciclo-', ''), 10) || curso.cicloOrigen;
          }
          return { ...curso, ciclo, tipoPeriodo, ubicacion };
        });

        const totalCiclos = cursosArray.reduce(
          (mayor, curso) => Math.max(mayor, curso.cicloOrigen || curso.ciclo || 1),
          1
        );

        return generarPlanificacionAutomatica(cursosArray as any[], {
          limiteCreditos: state.tarifario?.limitesAcademicos?.creditosMaximos,
          totalCiclos
        });
      },

      /** Aplica el plan curricular del motor algorítmico a las asignaciones visuales */
      aplicarPlanAcademico: (academicCursos) => {
        const state = get();
        const nuevasAsignaciones = { ...state.asignaciones };
        academicCursos.forEach((c) => {
          if (!state.cursos[c.codigo]) return;
          if (c.ubicacion === 'banco') {
            nuevasAsignaciones[c.codigo] = 'pozo';
          } else if (c.tipoPeriodo === 'VERANO') {
            nuevasAsignaciones[c.codigo] = `verano-${c.ciclo}`;
          } else {
            nuevasAsignaciones[c.codigo] = `ciclo-${c.ciclo}`;
          }
        });
        set({ asignaciones: nuevasAsignaciones, cursosConPrereqRoto: [] });
      },

      /** Restaura una copia de seguridad JSON completa */
      cargarRespaldo: (respaldo) => {
        set({
          cursos: respaldo.cursos,
          asignaciones: respaldo.asignaciones,
          facultad: respaldo.facultad,
          metodoPago: respaldo.descuento === 'bcp' ? 'bcp_interbank' : (respaldo.descuento === 'scotiabank' ? 'scotiabank_bbva' : 'sin_descuento'),
          cicloInicio: respaldo.cicloInicio,
          cicloFin: respaldo.cicloFin,
          veranoActivo: respaldo.veranoActivo,
          cantVeranos: respaldo.cantVeranos,
          periodoIngreso: respaldo.periodoIngreso || 'marzo',
          veranoUbicaciones:
            respaldo.veranoUbicaciones ||
            (respaldo.periodoIngreso === 'agosto'
              ? { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 }
              : { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }),
          nombreArchivoCargado: respaldo.nombreArchivoCargado,
          cursosConPrereqRoto: [],
        });
      },

      exportarRespaldo: () => {
        const s = get();
        return {
          version: '1.0',
          fecha: new Date().toISOString(),
          nombreArchivoCargado: s.nombreArchivoCargado,
          facultad: s.facultad,
          metodoPago: s.metodoPago,
          cicloInicio: s.cicloInicio,
          cicloFin: s.cicloFin,
          veranoActivo: s.veranoActivo,
          cantVeranos: s.cantVeranos,
          periodoIngreso: s.periodoIngreso,
          veranoUbicaciones: s.veranoUbicaciones,
          cursos: s.cursos,
          asignaciones: s.asignaciones,
        };
      },

      // ── Acciones Config ────────────────────────────────────────────────────

      setFacultad: (facultad) => set({ facultad }),
      setMetodoPago: (metodoPago) => set({ metodoPago }),
      setCicloInicio: (ciclo) => set({ cicloInicio: Math.min(14, Math.max(1, ciclo)) }),
      setCicloFin: (ciclo) => set({ cicloFin: Math.min(14, Math.max(1, ciclo)) }),
      setVeranoActivo: (activo) => set({ veranoActivo: activo }),
      setCantVeranos: (cant) => set({ cantVeranos: Math.min(5, Math.max(1, cant)) }),

      setPeriodoIngreso: (periodo) => {
        // UTP: Inicio marzo → verano 1 tras ciclo 2 (ene). Inicio agosto → verano 1 tras ciclo 1 (ene).
        const veranoUbicaciones =
          periodo === 'agosto'
            ? { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 }
            : { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 };
        set({ periodoIngreso: periodo, veranoUbicaciones });
        // Recalcular rupturas con la nueva cronología
        const state = get();
        const nuevosRotos = obtenerTodosCursosRotos(
          state.cursos,
          state.asignaciones,
          veranoUbicaciones
        );
        set({ cursosConPrereqRoto: nuevosRotos });
      },

      setVeranoUbicacion: (veranoNum, trasCiclo) =>
        set((state) => ({
          veranoUbicaciones: { ...state.veranoUbicaciones, [veranoNum]: trasCiclo },
        })),

      toggleVeranoHabilitado: (veranoNum) => {
        set((state) => {
          const actual = state.veranosHabilitados[veranoNum] ?? true;
          const nuevo = !actual;
          const nuevasAsignaciones = { ...state.asignaciones };

          // Si se deshabilita este periodo de verano, reubicar cualquier curso asignado de vuelta al pozo
          if (!nuevo) {
            const cicloId = `verano-${veranoNum}`;
            for (const [cod, ubi] of Object.entries(nuevasAsignaciones)) {
              if (ubi === cicloId) {
                nuevasAsignaciones[cod] = 'pozo';
              }
            }
          }

          const nuevosRotos = obtenerTodosCursosRotos(
            state.cursos,
            nuevasAsignaciones,
            state.veranoUbicaciones
          );

          return {
            veranosHabilitados: { ...state.veranosHabilitados, [veranoNum]: nuevo },
            asignaciones: nuevasAsignaciones,
            cursosConPrereqRoto: nuevosRotos,
          };
        });
      },

      setVeranoHabilitado: (veranoNum, habilitado) => {
        set((state) => {
          const nuevasAsignaciones = { ...state.asignaciones };
          if (!habilitado) {
            const cicloId = `verano-${veranoNum}`;
            for (const [cod, ubi] of Object.entries(nuevasAsignaciones)) {
              if (ubi === cicloId) {
                nuevasAsignaciones[cod] = 'pozo';
              }
            }
          }
          return {
            veranosHabilitados: { ...state.veranosHabilitados, [veranoNum]: habilitado },
            asignaciones: nuevasAsignaciones,
          };
        });
      },

      setTarifario: (tarifario) => {
        const disciplinas = Object.keys(tarifario.disciplinas);
        const actual = get().disciplinaActiva;
        const disciplinaActiva = disciplinas.includes(actual)
          ? actual
          : (disciplinas[0] ?? actual);
        set({ tarifario, disciplinaActiva });
      },

      setDisciplinaActiva: (disciplinaActiva) => set({ disciplinaActiva }),

      // ── Acciones UI ────────────────────────────────────────────────────────

      setBienvenidaModalOpen: (open) => set({ bienvenidaModalOpen: open }),
      setConfigSidebarOpen: (open) => set({ configSidebarOpen: open }),
      setDrawerMobOpen: (open) => set({ drawerMobOpen: open }),
      setMenuMobOpen: (open) => set({ menuMobOpen: open }),
      setPanelPlanificadorAbierto: (panelPlanificadorAbierto) =>
        set({ panelPlanificadorAbierto }),
      setPestanaEstrategia: (pestanaEstrategia) => set({ pestanaEstrategia }),
      abrirEstrategia: (pestana = 'academico') =>
        set({ panelPlanificadorAbierto: true, pestanaEstrategia: pestana }),

      // ── Acciones Feedback ──────────────────────────────────────────────────

      setBlockedInfo: (blockedInfo) => set({ blockedInfo }),
      setCascadaAlerta: (cascadaAlerta) => set({ cascadaAlerta }),
      setCursoAMover: (cursoAMover) => set({ cursoAMover }),
      setCursosConPrereqRoto: (codigos) => set({ cursosConPrereqRoto: codigos }),
      setNotificacionMovimiento: (notificacionMovimiento) => set({ notificacionMovimiento }),
      limpiarNotificacionMovimiento: () => set({ notificacionMovimiento: null }),
      toggleSeleccionMatricula: (codigo) => {
        const actual = get().cursosSeleccionadosParaMatricula;
        const existe = actual.includes(codigo);
        set({
          cursosSeleccionadosParaMatricula: existe
            ? actual.filter((c) => c !== codigo)
            : [...actual, codigo],
        });
      },
    }),
    {
      name: 'malla_asignaciones', // misma key que mallaStore → migración sin pérdida de datos
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cursos: state.cursos,
        asignaciones: state.asignaciones,
        facultad: state.facultad,
        metodoPago: state.metodoPago,
        cicloInicio: state.cicloInicio,
        cicloFin: state.cicloFin,
        veranoActivo: state.veranoActivo,
        cantVeranos: state.cantVeranos,
        periodoIngreso: state.periodoIngreso,
        veranoUbicaciones: state.veranoUbicaciones,
        veranosHabilitados: state.veranosHabilitados,
        nombreArchivoCargado: state.nombreArchivoCargado,
        disciplinaActiva: state.disciplinaActiva,
      }),
    }
  )
);

// Re-export oficial para selectores de Zustand 5
export { useShallow } from 'zustand/react/shallow';

