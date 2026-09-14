import { create } from 'zustand';
import type {
  Curso,
  EstadoCurso,
  NotificacionMovimiento,
  Tarifario,
} from '../types/academic';
import { db } from '../services/db';
import { validarPrerequisitosParaCiclo } from '../utils/academicGraph';
import { generateOptimalPlanUseCase } from '../application/usecases/generateOptimalPlanUseCase';
import type { ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';

interface AcademicStore {
  cursos: Curso[];
  tarifario: Tarifario | null;
  disciplinaActiva: string;
  cursosSeleccionadosParaMatricula: string[];
  panelPlanificadorAbierto: boolean;
  cursoAMover: string | null;
  notificacionMovimiento: NotificacionMovimiento | null;
  nombreArchivoCargado: string | null;
  setCursos: (cursos: Curso[], nombreArchivo?: string) => Promise<void>;
  updateEstadoCurso: (codigo: string, estado: EstadoCurso) => Promise<void>;
  moverCursoACiclo: (codigo: string, nuevoCiclo: number) => Promise<boolean>;
  moverCursoABanco: (codigo: string) => Promise<boolean>;
  reiniciarPlanificacion: () => Promise<void>;
  generarPlanificacionOptima: () => Promise<ResultadoPlanificacionAutomatica>;
  toggleSeleccionMatricula: (codigo: string) => void;
  setTarifario: (tarifario: Tarifario) => Promise<void>;
  setDisciplinaActiva: (disciplina: string) => Promise<void>;
  setPanelPlanificadorAbierto: (abierto: boolean) => void;
  setCursoAMover: (codigo: string | null) => void;
  limpiarNotificacionMovimiento: () => void;
  cargarDesdeDB: () => Promise<void>;
  importarCursos: (cursos: Curso[]) => Promise<void>;
}

const esCursoFijo = (curso: Curso): boolean =>
  curso.estado === 'APROBADO' ||
  curso.estado === 'CONVALIDADO' ||
  curso.estado === 'EN_CURSO';

const normalizarCurso = (curso: Curso): Curso => {
  const cicloOrigen = curso.cicloOrigen || curso.ciclo || 1;
  const ubicacion = curso.ubicacion ?? (esCursoFijo(curso) ? 'ciclo' : 'banco');

  return {
    ...curso,
    ciclo: curso.ciclo || cicloOrigen,
    cicloOrigen,
    ubicacion,
    prerrequisitos: curso.prerrequisitos ?? [],
  };
};

const ordenarCursos = (cursos: Curso[]): Curso[] =>
  [...cursos].sort((a, b) => {
    if (a.cicloOrigen !== b.cicloOrigen) return a.cicloOrigen - b.cicloOrigen;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  cursos: [],
  tarifario: null,
  disciplinaActiva: 'Ingeniería y Tecnología',
  cursosSeleccionadosParaMatricula: [],
  panelPlanificadorAbierto: false,
  cursoAMover: null,
  notificacionMovimiento: null,
  nombreArchivoCargado: null,

  setCursos: async (cursos, nombreArchivo) => {
    const cursosNormalizados = ordenarCursos(
      cursos.map((curso) => {
        const normalizado = normalizarCurso(curso);
        return {
          ...normalizado,
          ciclo: normalizado.cicloOrigen,
          ubicacion: esCursoFijo(normalizado) ? 'ciclo' : 'banco',
        };
      })
    );

    set({
      cursos: cursosNormalizados,
      cursosSeleccionadosParaMatricula: [],
      cursoAMover: null,
      notificacionMovimiento: null,
      nombreArchivoCargado: nombreArchivo ?? null,
    });

    await db.transaction('rw', db.courses, db.profile, async () => {
      await db.courses.clear();
      await db.courses.bulkPut(cursosNormalizados);

      const perfilActual = await db.profile.get('current_profile');
      if (nombreArchivo) {
        await db.profile.put({
          id: 'current_profile',
          universidadId: perfilActual?.universidadId || get().tarifario?.universidadId || 'pe-utp',
          carrera: perfilActual?.carrera || 'Ingeniería de Sistemas e Informática',
          disciplinaActiva: perfilActual?.disciplinaActiva || get().disciplinaActiva,
          fechaActualizacion: new Date().toISOString(),
          nombreArchivoCargado: nombreArchivo,
        });
      }
    });
  },

  updateEstadoCurso: async (codigo, nuevoEstado) => {
    const cursoActual = get().cursos.find((curso) => curso.codigo === codigo);
    if (!cursoActual) return;

    const ubicacion =
      nuevoEstado === 'APROBADO' || nuevoEstado === 'CONVALIDADO' || nuevoEstado === 'EN_CURSO'
        ? 'ciclo'
        : cursoActual.ubicacion;

    const cursosActualizados = ordenarCursos(
      get().cursos.map((curso) =>
        curso.codigo === codigo ? { ...curso, estado: nuevoEstado, ubicacion } : curso
      )
    );

    set({ cursos: cursosActualizados });
    await db.courses.update(codigo, { estado: nuevoEstado, ubicacion });
  },

  moverCursoACiclo: async (codigo, nuevoCiclo) => {
    const curso = get().cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;

    if (esCursoFijo(curso)) {
      set({
        notificacionMovimiento: {
          tipo: 'INMOVIBLE',
          cursoNombre: curso.nombre,
        },
      });
      return false;
    }

    const { valido, faltantes } = validarPrerequisitosParaCiclo(
      curso,
      get().cursos,
      nuevoCiclo
    );

    if (!valido) {
      set({
        notificacionMovimiento: {
          tipo: 'PRERREQUISITOS',
          cursoNombre: curso.nombre,
          faltantes,
        },
      });
      return false;
    }

    const cursosActualizados = ordenarCursos(
      get().cursos.map((item) =>
        item.codigo === codigo
          ? { ...item, ciclo: nuevoCiclo, ubicacion: 'ciclo' as const }
          : item
      )
    );

    set({
      cursos: cursosActualizados,
      cursoAMover: null,
      notificacionMovimiento: null,
    });
    await db.courses.update(codigo, { ciclo: nuevoCiclo, ubicacion: 'ciclo' });
    return true;
  },

  moverCursoABanco: async (codigo) => {
    const curso = get().cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;

    if (esCursoFijo(curso)) {
      set({
        notificacionMovimiento: {
          tipo: 'INMOVIBLE',
          cursoNombre: curso.nombre,
        },
      });
      return false;
    }

    const cursosActualizados = ordenarCursos(
      get().cursos.map((item) =>
        item.codigo === codigo
          ? { ...item, ciclo: item.cicloOrigen, ubicacion: 'banco' as const }
          : item
      )
    );

    set({
      cursos: cursosActualizados,
      cursoAMover: null,
      notificacionMovimiento: null,
    });
    await db.courses.update(codigo, { ciclo: curso.cicloOrigen, ubicacion: 'banco' });
    return true;
  },

  reiniciarPlanificacion: async () => {
    const cursosActualizados = ordenarCursos(
      get().cursos.map((curso) => {
        if (curso.estado !== 'PENDIENTE') return curso;
        return { ...curso, ciclo: curso.cicloOrigen, ubicacion: 'banco' as const };
      })
    );

    set({
      cursos: cursosActualizados,
      cursosSeleccionadosParaMatricula: [],
      cursoAMover: null,
      notificacionMovimiento: null,
    });
    await db.courses.bulkPut(cursosActualizados);
  },

  generarPlanificacionOptima: async () => {
    const { cursos, tarifario } = get();
    const totalCiclos = cursos.reduce(
      (mayor, curso) => Math.max(mayor, curso.cicloOrigen || curso.ciclo || 1),
      1
    );

    const resultado = generateOptimalPlanUseCase({
      cursos,
      limiteCreditos: tarifario?.limitesAcademicos?.creditosMaximos,
      totalCiclos,
    });

    const cursosOrdenados = ordenarCursos(resultado.cursos);
    set({
      cursos: cursosOrdenados,
      cursosSeleccionadosParaMatricula: [],
      cursoAMover: null,
      notificacionMovimiento: null,
    });

    await db.courses.bulkPut(cursosOrdenados);
    return { ...resultado, cursos: cursosOrdenados };
  },

  toggleSeleccionMatricula: (codigo) => {
    const actual = get().cursosSeleccionadosParaMatricula;
    const existe = actual.includes(codigo);
    set({
      cursosSeleccionadosParaMatricula: existe
        ? actual.filter((item) => item !== codigo)
        : [...actual, codigo],
    });
  },

  setTarifario: async (tarifario) => {
    set({ tarifario });
    await db.customCosts.put(tarifario);
  },

  setDisciplinaActiva: async (disciplinaActiva) => {
    set({ disciplinaActiva });
    const perfilActual = await db.profile.get('current_profile');
    await db.profile.put({
      id: 'current_profile',
      universidadId: get().tarifario?.universidadId || perfilActual?.universidadId || 'pe-utp',
      carrera: perfilActual?.carrera || 'Ingeniería de Sistemas e Informática',
      disciplinaActiva,
      fechaActualizacion: new Date().toISOString(),
      nombreArchivoCargado: get().nombreArchivoCargado || perfilActual?.nombreArchivoCargado,
    });
  },

  setPanelPlanificadorAbierto: (panelPlanificadorAbierto) => set({ panelPlanificadorAbierto }),

  setCursoAMover: (cursoAMover) => set({ cursoAMover }),

  limpiarNotificacionMovimiento: () => set({ notificacionMovimiento: null }),

  importarCursos: async (cursosImportados) => {
    const cursosNormalizados = ordenarCursos(cursosImportados.map(normalizarCurso));
    set({ cursos: cursosNormalizados, cursoAMover: null });
    await db.courses.clear();
    await db.courses.bulkPut(cursosNormalizados);
  },

  cargarDesdeDB: async () => {
    const cursosDB = await db.courses.toArray();
    const tarifariosDB = await db.customCosts.toArray();
    const profileDB = await db.profile.get('current_profile');

    if (cursosDB.length > 0) {
      const cursosNormalizados = ordenarCursos(cursosDB.map(normalizarCurso));
      set({ cursos: cursosNormalizados });

      const necesitaMigracion = cursosDB.some(
        (curso) => !curso.cicloOrigen || !curso.ubicacion
      );
      if (necesitaMigracion) await db.courses.bulkPut(cursosNormalizados);
    }

    if (tarifariosDB.length > 0) set({ tarifario: tarifariosDB[0] });
    if (profileDB) {
      set({
        disciplinaActiva: profileDB.disciplinaActiva,
        nombreArchivoCargado: profileDB.nombreArchivoCargado ?? null,
      });
    }
  },
}));
