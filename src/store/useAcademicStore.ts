import { create } from 'zustand';
import type {
  Curso,
  EstadoCurso,
  NotificacionMovimiento,
  PeriodoAcademico,
  Tarifario,
} from '../types/academic';
import { db } from '../services/db';
import { generateOptimalPlanUseCase } from '../application/usecases/generateOptimalPlanUseCase';
import { moveCourseUseCase } from '../application/usecases/moveCourseUseCase';
import type { ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';
import { cursoBloqueado, normalizarCurso, ordenarCursos } from '../domain/rules/courseRules';
import { crearPeriodoRegular, crearPeriodoVerano } from '../domain/rules/academicPeriodRules';

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
  moverCursoAPeriodo: (codigo: string, periodo: PeriodoAcademico) => Promise<boolean>;
  moverCursoACiclo: (codigo: string, nuevoCiclo: number) => Promise<boolean>;
  moverCursoAVerano: (codigo: string, despuesDelCiclo: number) => Promise<boolean>;
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

const notificacionDesdeResultado = (
  curso: Curso,
  periodo: PeriodoAcademico,
  resultado: ReturnType<typeof moveCourseUseCase>
): NotificacionMovimiento | null => {
  if (resultado.ok) return null;

  switch (resultado.reason) {
    case 'LOCKED':
      return { tipo: 'INMOVIBLE', cursoNombre: curso.nombre };
    case 'PAST_PERIOD':
      return {
        tipo: 'PERIODO_ANTERIOR',
        cursoNombre: curso.nombre,
        periodoDestino: periodo.etiqueta,
        mensaje: `No se puede planificar en ${periodo.etiqueta} porque es anterior al periodo académico actual.`,
      };
    case 'CURRENT_PERIOD':
      return {
        tipo: 'PERIODO_ACTUAL',
        cursoNombre: curso.nombre,
        periodoDestino: periodo.etiqueta,
        mensaje: `No se pueden agregar cursos a ${periodo.etiqueta} porque ese es el periodo que ya estás cursando. Puedes planificarlos desde el verano posterior.`,
      };
    case 'PREREQUISITES':
      return {
        tipo: 'PRERREQUISITOS',
        cursoNombre: curso.nombre,
        faltantes: resultado.faltantes,
        periodoDestino: periodo.etiqueta,
      };
    case 'SUMMER_CREDIT_LIMIT':
      return {
        tipo: 'LIMITE_CREDITOS_VERANO',
        cursoNombre: curso.nombre,
        periodoDestino: periodo.etiqueta,
        limite: resultado.limite,
        valorActual: resultado.total,
        mensaje: `El verano admite como máximo ${resultado.limite} créditos. Con este curso se alcanzarían ${resultado.total}.`,
      };
    case 'HOUR_LIMIT':
      return {
        tipo: 'LIMITE_HORAS',
        cursoNombre: curso.nombre,
        periodoDestino: periodo.etiqueta,
        limite: resultado.limite,
        valorActual: resultado.total,
        mensaje: `La carga del periodo no puede superar ${resultado.limite} horas efectivas. Con este curso se alcanzarían ${resultado.total}.`,
      };
    default:
      return null;
  }
};

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  cursos: [],
  tarifario: null,
  disciplinaActiva: 'Ingeniería y Arquitectura',
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
          tipoPeriodo: 'REGULAR' as const,
          ubicacion: cursoBloqueado(normalizado) ? 'periodo' as const : 'banco' as const,
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

    const ubicacion = cursoBloqueado({ ...cursoActual, estado: nuevoEstado })
      ? 'periodo' as const
      : cursoActual.ubicacion;

    const cursosActualizados = ordenarCursos(
      get().cursos.map((curso) =>
        curso.codigo === codigo ? { ...curso, estado: nuevoEstado, ubicacion } : curso
      )
    );

    set({ cursos: cursosActualizados });
    await db.courses.update(codigo, { estado: nuevoEstado, ubicacion });
  },

  moverCursoAPeriodo: async (codigo, periodo) => {
    const curso = get().cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;

    const resultado = moveCourseUseCase(get().cursos, codigo, periodo);
    if (!resultado.ok) {
      set({ notificacionMovimiento: notificacionDesdeResultado(curso, periodo, resultado) });
      return false;
    }

    const cursosActualizados = ordenarCursos(resultado.cursos);
    const actualizado = cursosActualizados.find((item) => item.codigo === codigo)!;

    set({
      cursos: cursosActualizados,
      cursoAMover: null,
      notificacionMovimiento: null,
    });
    await db.courses.update(codigo, {
      ciclo: actualizado.ciclo,
      tipoPeriodo: actualizado.tipoPeriodo,
      ubicacion: actualizado.ubicacion,
    });
    return true;
  },

  moverCursoACiclo: async (codigo, nuevoCiclo) =>
    get().moverCursoAPeriodo(codigo, crearPeriodoRegular(nuevoCiclo)),

  moverCursoAVerano: async (codigo, despuesDelCiclo) =>
    get().moverCursoAPeriodo(codigo, crearPeriodoVerano(despuesDelCiclo)),

  moverCursoABanco: async (codigo) => {
    const curso = get().cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;

    if (cursoBloqueado(curso)) {
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
          ? {
              ...item,
              ciclo: item.cicloOrigen,
              tipoPeriodo: 'REGULAR' as const,
              ubicacion: 'banco' as const,
            }
          : item
      )
    );

    set({
      cursos: cursosActualizados,
      cursoAMover: null,
      notificacionMovimiento: null,
    });
    await db.courses.update(codigo, {
      ciclo: curso.cicloOrigen,
      tipoPeriodo: 'REGULAR',
      ubicacion: 'banco',
    });
    return true;
  },

  reiniciarPlanificacion: async () => {
    const cursosActualizados = ordenarCursos(
      get().cursos.map((curso) => {
        if (curso.estado !== 'PENDIENTE') return curso;
        return {
          ...curso,
          ciclo: curso.cicloOrigen,
          tipoPeriodo: 'REGULAR' as const,
          ubicacion: 'banco' as const,
        };
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
    const disciplinas = Object.keys(tarifario.disciplinas);
    const disciplinaActual = get().disciplinaActiva;
    const disciplinaValida = disciplinas.includes(disciplinaActual)
      ? disciplinaActual
      : (disciplinas[0] ?? disciplinaActual);

    set({ tarifario, disciplinaActiva: disciplinaValida });
    await db.customCosts.put(tarifario);

    const perfilActual = await db.profile.get('current_profile');
    if (perfilActual && perfilActual.disciplinaActiva !== disciplinaValida) {
      await db.profile.put({
        ...perfilActual,
        disciplinaActiva: disciplinaValida,
        fechaActualizacion: new Date().toISOString(),
      });
    }
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

      const necesitaMigracion = cursosDB.some((curso) => {
        const ubicacion = curso.ubicacion as string | undefined;
        return !curso.cicloOrigen || !curso.tipoPeriodo || !ubicacion || ubicacion === 'ciclo';
      });
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
