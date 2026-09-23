// Store global con Zustand + persistencia automática en localStorage
// Maneja el estado completo del planificador

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Curso, UbicacionCurso } from '@/types/malla';
import type { FacultadKey, DescuentoKey } from '@/data/tarifario';
import { validarPrerequisitos, verificarRupturasEnCascada, obtenerTodosCursosRotos } from '@/utils/validators';
import { calcularCicloActual } from '@/utils/cicloHelper';
import { generarPlanificacionOptima, type PlanificacionResumen } from '@/services/autoPlannerService';
import type { RespaldoMalla } from '@/services/backupService';

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

  /** Controla el drawer de pendientes en móvil (≤ 640px) */
  drawerMobOpen: boolean;

  /** Controla el menú responsive de opciones/filtros (≤ 768px) */
  menuMobOpen: boolean;
  
  /** Controla el panel lateral de configuración */
  configSidebarOpen: boolean;

  /** Mapa de a qué ciclo regular sigue cada verano (ej. 1: 2 -> verano 1 tras ciclo 2) */
  veranoUbicaciones: Record<number, number>;

  /** Códigos de cursos con prerrequisitos rotos por movimientos en cascada */
  cursosConPrereqRoto: string[];

  /** Estado de alertas toast (bloqueo y cascada) */
  blockedInfo: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null;
  cascadaAlerta: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null;

  /** Código del curso actualmente seleccionado para mover (patrón Two-Tap de dev) */
  cursoAMover: string | null;

  // ── Acciones ─────────────────────────────────────────────────────
  setCursos: (cursos: Record<string, Curso>, nombreArchivo: string) => void;
  restaurarMalla: (cursos: Record<string, Curso>, nombreArchivo: string) => void;
  setAsignacion: (codigoCurso: string, ubicacion: UbicacionCurso) => void;
  moverCurso: (codigoCurso: string, destino: UbicacionCurso) => void;
  ejecutarMovimiento: (codigoCurso: string, destino: UbicacionCurso) => boolean;
  resetAsignaciones: () => void;
  autoPlanificar: () => PlanificacionResumen | null;
  cargarRespaldo: (respaldo: RespaldoMalla) => void;

  setBlockedInfo: (info: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null) => void;
  setCascadaAlerta: (alerta: { cursoNombre: string; faltantes: { codigo: string; nombre: string }[] } | null) => void;
  setCursoAMover: (codigo: string | null) => void;
  setFacultad: (facultad: FacultadKey) => void;
  setDescuento: (descuento: DescuentoKey) => void;
  setCicloInicio: (ciclo: number) => void;
  setCicloFin: (ciclo: number) => void;
  setVeranoActivo: (activo: boolean) => void;
  setCantVeranos: (cant: number) => void;
  setDrawerMobOpen: (open: boolean) => void;
  setMenuMobOpen: (open: boolean) => void;
  setConfigSidebarOpen: (open: boolean) => void;
  setVeranoUbicacion: (veranoNum: number, trasCiclo: number) => void;
  setCursosConPrereqRoto: (codigos: string[]) => void;
}

export const useMallaStore = create<MallaState>()(
  persist(
    (set, get) => ({
      // ── Estado inicial ──────────────────────────────────────────
      cursos: {},
      asignaciones: {},
      facultad: 'ingenieria',
      descuento: 'scotiabank',
      cicloInicio: 1,
      cicloFin: 12,
      veranoActivo: false,
      cantVeranos: 3,
      nombreArchivoCargado: null,
      drawerMobOpen: false,
      menuMobOpen: false,
      configSidebarOpen: false,
      veranoUbicaciones: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 },
      cursosConPrereqRoto: [],
      blockedInfo: null,
      cascadaAlerta: null,
      cursoAMover: null,

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
        const maxOrigen = Object.values(cursos).length > 0
          ? Math.max(...Object.values(cursos).map((c) => c.cicloOrigen))
          : 12;
        set({
          cursos,
          asignaciones,
          nombreArchivoCargado: nombreArchivo,
          cicloInicio: 1,
          cicloFin: Math.max(12, maxOrigen),
        });
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

      setBlockedInfo: (blockedInfo) => set({ blockedInfo }),
      setCascadaAlerta: (cascadaAlerta) => set({ cascadaAlerta }),

      /** Ejecuta el movimiento validando prerrequisitos y detectando rupturas en cascada */
      ejecutarMovimiento: (codigoCurso, destino) => {
        const state = get();
        const curso = state.cursos[codigoCurso];
        if (!curso) return false;

        // Si se devuelve al pozo -> siempre permitido
        if (destino === 'pozo') {
          const rotos = verificarRupturasEnCascada(
            codigoCurso,
            'pozo',
            state.cursos,
            state.asignaciones,
            state.veranoUbicaciones
          );
          state.moverCurso(codigoCurso, 'pozo');
          
          const nuevosRotos = obtenerTodosCursosRotos(state.cursos, get().asignaciones, state.veranoUbicaciones);

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

        // Si se asigna a un ciclo (regular o verano) -> validar prerrequisitos
        const { valido, faltantes } = validarPrerequisitos(
          curso,
          state.cursos,
          state.asignaciones,
          destino,
          state.veranoUbicaciones
        );
        if (!valido) {
          set({
            blockedInfo: {
              cursoNombre: curso.nombre,
              faltantes,
            },
          });
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

        const nuevosRotos = obtenerTodosCursosRotos(state.cursos, get().asignaciones, state.veranoUbicaciones);
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
            const esPendiente = curso.estado === 'PENDIENTE';
            const estaEnCiclo = ubicacion !== 'pozo';
            if (esPendiente && estaEnCiclo) {
              nuevasAsignaciones[codigo] = 'pozo';
            }
          }
          return { 
            asignaciones: nuevasAsignaciones,
            cursosConPrereqRoto: [],
            blockedInfo: null,
            cascadaAlerta: null,
            cursoAMover: null
          };
        }),

      /** Genera automáticamente la planificación óptima de cursos a partir del ciclo lectivo activo */
      autoPlanificar: () => {
        const state = get();
        if (Object.keys(state.cursos).length === 0) return null;
        const cicloActivo = calcularCicloActual(state.cursos);
        const { nuevasAsignaciones, resumen } = generarPlanificacionOptima(
          state.cursos,
          state.asignaciones,
          cicloActivo,
          state.cicloFin,
          22
        );
        set({ asignaciones: nuevasAsignaciones, cursosConPrereqRoto: [] });
        return resumen;
      },

      /** Restaura una copia de seguridad JSON completa */
      cargarRespaldo: (respaldo) => {
        set({
          cursos: respaldo.cursos,
          asignaciones: respaldo.asignaciones,
          facultad: respaldo.facultad,
          descuento: respaldo.descuento,
          cicloInicio: respaldo.cicloInicio,
          cicloFin: respaldo.cicloFin,
          veranoActivo: respaldo.veranoActivo,
          cantVeranos: respaldo.cantVeranos,
          veranoUbicaciones: respaldo.veranoUbicaciones || { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 },
          nombreArchivoCargado: respaldo.nombreArchivoCargado,
          cursosConPrereqRoto: [],
        });
      },

      setFacultad: (facultad) => set({ facultad }),
      setDescuento: (descuento) => set({ descuento }),
      setCicloInicio: (ciclo) => set({ cicloInicio: Math.min(14, Math.max(1, ciclo)) }),
      setCicloFin: (ciclo) => set({ cicloFin: Math.min(14, Math.max(1, ciclo)) }),
      setVeranoActivo: (activo) => set({ veranoActivo: activo }),
      setCantVeranos: (cant) => set({ cantVeranos: Math.min(5, Math.max(1, cant)) }),
      setDrawerMobOpen: (open) => set({ drawerMobOpen: open }),
      setMenuMobOpen: (open) => set({ menuMobOpen: open }),
      setConfigSidebarOpen: (open) => set({ configSidebarOpen: open }),
      setVeranoUbicacion: (veranoNum, trasCiclo) =>
        set((state) => ({
          veranoUbicaciones: { ...state.veranoUbicaciones, [veranoNum]: trasCiclo },
        })),
      setCursosConPrereqRoto: (codigos) => set({ cursosConPrereqRoto: codigos }),
      setCursoAMover: (cursoAMover) => set({ cursoAMover }),
    }),
    {
      name: 'malla_asignaciones', // key en localStorage
      storage: createJSONStorage(() => localStorage),
      // Persistir configuración, asignaciones y nombre del archivo
      partialize: (state) => ({
        cursos: state.cursos,
        asignaciones: state.asignaciones,
        facultad: state.facultad,
        descuento: state.descuento,
        cicloInicio: state.cicloInicio,
        cicloFin: state.cicloFin,
        veranoActivo: state.veranoActivo,
        cantVeranos: state.cantVeranos,
        veranoUbicaciones: state.veranoUbicaciones,
        nombreArchivoCargado: state.nombreArchivoCargado,
      }),
    }
  )
);
