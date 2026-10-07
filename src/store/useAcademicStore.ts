import { formatCredits } from '../utils/formatCredits';
import { create } from 'zustand';
import type { Curso, EstadoCurso, NotificacionMovimiento, PeriodoAcademico, PeriodoIngreso } from '../types/academic';
import type { Tarifario } from '../types/financial';
import { db } from '../services/db';
import { generateOptimalPlanUseCase } from '../application/usecases/generateOptimalPlanUseCase';
import { moveCourseUseCase } from '../application/usecases/moveCourseUseCase';
import { validarCargaPlanificacionAutomatica, type ResultadoPlanificacionAutomatica } from '../domain/services/automaticPlanningService';
import { cursoBloqueado, normalizarCurso, ordenarCursos } from '../domain/rules/courseRules';
import { crearPeriodoRegular, crearPeriodoVerano, determinarPeriodoEnCurso, obtenerPeriodoCurso } from '../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual, ubicarAvanceEnCicloActual } from '../domain/rules/academicContextRules';
import { migrateLegacyFinancialRulesReference } from '../financial/rules/financialRulesCompatibility';
import { detectarNuevosConflictosDescendientes } from '../utils/academicGraph';
import { CICLOS_INICIALES, MAXIMO_CICLOS, determinarTotalCiclos, normalizarTotalCiclos, normalizarCiclosExcluidos, obtenerSiguienteCiclo } from '../domain/rules/cycleRules';

interface AcademicStore {
  cursos: Curso[];
  tarifario: Tarifario | null;
  disciplinaActiva: string;
  cursosSeleccionadosParaMatricula: string[];
  panelPlanificadorAbierto: boolean;
  cursoAMover: string | null;
  notificacionMovimiento: NotificacionMovimiento | null;
  nombreArchivoCargado: string | null;
  periodoIngreso: PeriodoIngreso | null;
  cicloActual: number | null;
  totalCiclos: number;
  ciclosExcluidos: number[];
  perfilCargado: boolean;
  setTotalCiclos: (total: number) => Promise<void>;
  agregarCiclo: () => Promise<void>;
  eliminarCiclo: (ciclo: number) => Promise<boolean>;
  setContextoAcademico: (ingreso: PeriodoIngreso, ciclo: number) => Promise<void>;
  setCursos: (cursos: Curso[], nombreArchivo?: string) => Promise<void>;
  updateEstadoCurso: (codigo: string, estado: EstadoCurso) => Promise<void>;
  moverCursoAPeriodo: (codigo: string, periodo: PeriodoAcademico) => Promise<boolean>;
  moverCursoACiclo: (codigo: string, nuevoCiclo: number) => Promise<boolean>;
  moverCursoAVerano: (codigo: string, despuesDelCiclo: number) => Promise<boolean>;
  moverCursoABanco: (codigo: string) => Promise<boolean>;
  reiniciarPlanificacion: () => Promise<void>;
  generarPlanificacionOptima: () => Promise<ResultadoPlanificacionAutomatica>;
  previsualizarPlanificacionOptima: () => ResultadoPlanificacionAutomatica;
  aplicarPlanificacionOptima: (resultado: ResultadoPlanificacionAutomatica) => Promise<void>;
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
  if (resultado.ok) {
    if (!resultado.warning) return null;
    return {
      tipo: 'LIMITE_HORAS',
      cursoNombre: curso.nombre,
      periodoDestino: periodo.etiqueta,
      limite: resultado.warning.limite,
      valorActual: resultado.warning.total,
      mensaje: `El curso se asignó a ${periodo.etiqueta}. La carga es de ${resultado.warning.total} horas efectivas y supera las ${resultado.warning.limite} horas recomendadas.`,
    };
  }

  switch (resultado.reason) {
    case 'LOCKED':
      return { tipo: 'INMOVIBLE', cursoNombre: curso.nombre };
    case 'SOURCE_PERIOD_LOCKED':
      return { tipo: 'INMOVIBLE', cursoNombre: curso.nombre, mensaje: 'El ciclo actual y los anteriores no permiten quitar ni mover cursos.' };
    case 'SUMMER_NOT_AVAILABLE':
      return { tipo: 'PERIODO_ANTERIOR', cursoNombre: curso.nombre, mensaje: 'Ese verano no corresponde al mes de inicio de carrera seleccionado.' };
    case 'REMOVED_CYCLE':
      return { tipo: 'PERIODO_ANTERIOR', cursoNombre: curso.nombre, mensaje: 'Ese ciclo fue retirado. Vuelve a añadirlo para asignarle cursos.' };
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
        mensaje: resultado.limite !== undefined && resultado.total !== undefined
          ? `El verano admite como máximo ${formatCredits(resultado.limite)} créditos. Con este curso se alcanzarían ${formatCredits(resultado.total)}.`
          : 'El curso supera el límite de créditos de verano.',
      };
    default:
      return null;
  }
};

// Guardar retiros y recuperaciones en orden evita perder cambios por clics rápidos.
let cambiosCiclos = Promise.resolve();
const guardarCambioCiclos = <T>(cambio: () => Promise<T>): Promise<T> => {
  const resultado = cambiosCiclos.then(cambio);
  cambiosCiclos = resultado.then(() => undefined, () => undefined);
  return resultado;
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
  periodoIngreso: null,
  cicloActual: null,
  totalCiclos: CICLOS_INICIALES,
  ciclosExcluidos: [],
  perfilCargado: false,

  setTotalCiclos: async (total) => {
    if (!Number.isFinite(total)) return;
    const state = get();
    set({ totalCiclos: determinarTotalCiclos(state.cursos, Math.max(total, state.cicloActual ?? 1)) });
    const perfilActual = await db.profile.get('current_profile');
    await db.profile.put({
      ...perfilActual,
      id: 'current_profile',
      universidadId: perfilActual?.universidadId ?? get().tarifario?.universidadId ?? 'pe-utp',
      carrera: perfilActual?.carrera ?? 'Ingeniería de Sistemas e Informática',
      disciplinaActiva: get().disciplinaActiva,
      nombreArchivoCargado: get().nombreArchivoCargado ?? undefined,
      periodoIngreso: get().periodoIngreso ?? undefined,
      cicloActual: get().cicloActual ?? undefined,
      totalCiclos: get().totalCiclos,
      ciclosExcluidos: get().ciclosExcluidos,
      fechaActualizacion: new Date().toISOString(),
    });
  },

  agregarCiclo: () => guardarCambioCiclos(async () => {
    const state = get();
    const siguiente = obtenerSiguienteCiclo(state.totalCiclos, state.ciclosExcluidos);
    if (siguiente === null) return;
    set({ ciclosExcluidos: state.ciclosExcluidos.filter((ciclo) => ciclo !== siguiente) });
    await get().setTotalCiclos(Math.max(state.totalCiclos, siguiente));
  }),

  eliminarCiclo: (ciclo) => guardarCambioCiclos(async () => {
    const state = get();
    const actual = state.cicloActual ?? determinarPeriodoEnCurso(state.cursos)?.cicloReferencia ?? 0;
    if (!Number.isInteger(ciclo) || ciclo <= CICLOS_INICIALES || ciclo > state.totalCiclos ||
        ciclo <= actual || state.ciclosExcluidos.includes(ciclo)) return false;
    const cursosCiclo = state.cursos.filter((curso) => curso.ubicacion === 'periodo' &&
      curso.tipoPeriodo === 'REGULAR' && curso.ciclo === ciclo);
    if (cursosCiclo.some(cursoBloqueado)) return false;
    const retirados = new Set(cursosCiclo.map((curso) => curso.codigo));
    const cursos = ordenarCursos(state.cursos.map((curso) => retirados.has(curso.codigo)
      ? { ...curso, ciclo: curso.cicloOrigen, tipoPeriodo: 'REGULAR' as const, ubicacion: 'banco' as const }
      : curso));
    const ciclosExcluidos = normalizarCiclosExcluidos([...state.ciclosExcluidos, ciclo]);
    const afectados = cursosCiclo.length
      ? detectarNuevosConflictosDescendientes(state.cursos, cursos, cursosCiclo[0].codigo) : [];
    const perfil = await db.profile.get('current_profile');
    await db.transaction('rw', db.profile, db.courses, async () => {
      if (cursosCiclo.length) await db.courses.bulkPut(cursos);
      await db.profile.put({ ...perfil, id: 'current_profile',
        universidadId: perfil?.universidadId ?? state.tarifario?.universidadId ?? 'pe-utp',
        carrera: perfil?.carrera ?? 'Ingeniería de Sistemas e Informática',
        disciplinaActiva: state.disciplinaActiva,
        fechaActualizacion: new Date().toISOString(),
        nombreArchivoCargado: state.nombreArchivoCargado ?? undefined,
        periodoIngreso: state.periodoIngreso ?? undefined,
        cicloActual: state.cicloActual ?? undefined,
        totalCiclos: state.totalCiclos, ciclosExcluidos });
    });
    set({ cursos, ciclosExcluidos, cursoAMover: null,
      cursosSeleccionadosParaMatricula: state.cursosSeleccionadosParaMatricula.filter((codigo) => !retirados.has(codigo)),
      notificacionMovimiento: afectados.length ? {
        tipo: 'IMPACTO_DESCENDIENTE', cursoNombre: `Ciclo ${ciclo}`, faltantes: afectados,
        mensaje: 'Los cursos del ciclo retirado volvieron al banco. Algunos cursos posteriores necesitan que programes de nuevo sus prerrequisitos.',
      } : null });
    return true;
  }),

  setContextoAcademico: async (periodoIngreso, ciclo) => {
    const cicloActual = Math.max(1, Math.min(MAXIMO_CICLOS, Math.trunc(ciclo)));
    const cursos = ordenarCursos(ubicarAvanceEnCicloActual(get().cursos, cicloActual, periodoIngreso));
    const totalCiclos = determinarTotalCiclos(cursos, Math.max(get().totalCiclos, cicloActual));
    const ciclosExcluidos = get().ciclosExcluidos.filter((numero) => numero > cicloActual &&
      !cursos.some((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === numero));
    const perfilActual = await db.profile.get('current_profile');
    await db.transaction('rw', db.profile, db.courses, async () => {
      await db.profile.put({
        ...perfilActual,
        id: 'current_profile',
        universidadId: perfilActual?.universidadId ?? get().tarifario?.universidadId ?? 'pe-utp',
        carrera: perfilActual?.carrera ?? 'Ingeniería de Sistemas e Informática',
        disciplinaActiva: perfilActual?.disciplinaActiva ?? get().disciplinaActiva,
        nombreArchivoCargado: perfilActual?.nombreArchivoCargado ?? get().nombreArchivoCargado ?? undefined,
        fechaActualizacion: new Date().toISOString(),
        periodoIngreso,
        cicloActual,
        totalCiclos,
        ciclosExcluidos,
      });
      if (cursos.length) await db.courses.bulkPut(cursos);
    });
    set({ periodoIngreso, cicloActual, totalCiclos, ciclosExcluidos, cursos, cursoAMover: null });
  },

  setCursos: async (cursos, nombreArchivo) => {
    const cursosNormalizadosBase = ordenarCursos(
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

    const cursosNormalizados = get().cicloActual
      ? ordenarCursos(ubicarAvanceEnCicloActual(cursosNormalizadosBase, get().cicloActual!, get().periodoIngreso))
      : cursosNormalizadosBase;

    set({
      cursos: cursosNormalizados,
      totalCiclos: determinarTotalCiclos(cursosNormalizados, get().totalCiclos),
      ciclosExcluidos: [],
      cursosSeleccionadosParaMatricula: [],
      cursoAMover: null,
      notificacionMovimiento: null,
      nombreArchivoCargado: nombreArchivo ?? null,
    });

    await db.transaction('rw', db.courses, db.profile, async () => {
      await db.courses.clear();
      await db.courses.bulkPut(cursosNormalizados);

      const perfilActual = await db.profile.get('current_profile');
      if (nombreArchivo || perfilActual?.ciclosExcluidos?.length) {
        await db.profile.put({
          ...perfilActual,
          id: 'current_profile',
          universidadId: perfilActual?.universidadId || get().tarifario?.universidadId || 'pe-utp',
          carrera: perfilActual?.carrera || 'Ingeniería de Sistemas e Informática',
          disciplinaActiva: perfilActual?.disciplinaActiva || get().disciplinaActiva,
          fechaActualizacion: new Date().toISOString(),
          nombreArchivoCargado: get().nombreArchivoCargado ?? undefined,
          totalCiclos: get().totalCiclos,
          ciclosExcluidos: [],
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

    const cursosActualizados = ordenarCursos(get().cursos.map((curso) => {
      if (curso.codigo !== codigo) return curso;
      const actualizado = { ...curso, estado: nuevoEstado, ubicacion };
      return get().cicloActual
        ? ubicarAvanceEnCicloActual([actualizado], get().cicloActual!, get().periodoIngreso)[0]
        : actualizado;
    }));
    const actualizado = cursosActualizados.find((curso) => curso.codigo === codigo)!;

    set({ cursos: cursosActualizados });
    await db.courses.update(codigo, {
      estado: nuevoEstado,
      ubicacion: actualizado.ubicacion,
      ciclo: actualizado.ciclo,
      tipoPeriodo: actualizado.tipoPeriodo,
    });
  },

  moverCursoAPeriodo: async (codigo, periodo) => {
    const curso = get().cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;

    const resultado = moveCourseUseCase(get().cursos, codigo, periodo, {
      cicloActual: get().cicloActual,
      periodoIngreso: get().periodoIngreso,
      ciclosExcluidos: get().ciclosExcluidos,
    });
    if (!resultado.ok) {
      set({ notificacionMovimiento: notificacionDesdeResultado(curso, periodo, resultado) });
      return false;
    }

    const cursosActualizados = ordenarCursos(resultado.cursos);
    const actualizado = cursosActualizados.find((item) => item.codigo === codigo)!;
    const afectados = detectarNuevosConflictosDescendientes(get().cursos, cursosActualizados, codigo);
    const avisoHoras = notificacionDesdeResultado(curso, periodo, resultado);

    set({
      cursos: cursosActualizados,
      cursoAMover: null,
      notificacionMovimiento: afectados.length ? {
        tipo: 'IMPACTO_DESCENDIENTE', cursoNombre: curso.nombre, faltantes: afectados,
        mensaje: ['Este cambio deja cursos posteriores con prerrequisitos fuera de secuencia.', avisoHoras?.mensaje].filter(Boolean).join(' '),
      } : avisoHoras,
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

    if (get().cicloActual && curso.ubicacion === 'periodo' &&
        periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), get().cicloActual!)) {
      set({ notificacionMovimiento: {
        tipo: 'INMOVIBLE', cursoNombre: curso.nombre,
        mensaje: 'El ciclo actual y los anteriores no permiten quitar ni mover cursos.',
      } });
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
    const afectados = detectarNuevosConflictosDescendientes(get().cursos, cursosActualizados, codigo);

    set({
      cursos: cursosActualizados,
      cursoAMover: null,
      notificacionMovimiento: afectados.length ? {
        tipo: 'IMPACTO_DESCENDIENTE', cursoNombre: curso.nombre, faltantes: afectados,
        mensaje: 'Al retirar este curso, algunos cursos posteriores quedan sin su prerrequisito previo.',
      } : null,
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
        if (curso.estado !== 'PENDIENTE' ||
            (get().cicloActual && curso.ubicacion === 'periodo' &&
             periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), get().cicloActual!))) return curso;
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

  previsualizarPlanificacionOptima: () => {
    const { cursos, totalCiclos, ciclosExcluidos, cicloActual, periodoIngreso } = get();

    const resultado = generateOptimalPlanUseCase({
      cursos,
      totalCiclos,
      ciclosExcluidos,
      cicloActual,
      periodoIngreso,
    });

    return resultado;
  },

  aplicarPlanificacionOptima: async (resultado) => {
    const actuales = get().cursos;
    if (resultado.cursos.length !== actuales.length ||
        resultado.cursos.some((curso) => !actuales.some((actual) => actual.codigo === curso.codigo))) {
      throw new Error('La malla cambió desde que se generó la propuesta. Genera una propuesta nueva.');
    }

    validarCargaPlanificacionAutomatica(resultado);
    if (resultado.cursos.some((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' &&
        get().ciclosExcluidos.includes(curso.ciclo))) {
      throw new Error('La propuesta utiliza un ciclo retirado. Genera una propuesta nueva.');
    }
    const cursosOrdenados = ordenarCursos(resultado.cursos);
    set({
      cursos: cursosOrdenados,
      cursosSeleccionadosParaMatricula: [],
      cursoAMover: null,
      notificacionMovimiento: resultado.advertenciasHoras.length ? {
        tipo: 'LIMITE_HORAS',
        cursoNombre: 'Planificación automática',
        mensaje: `Se aplicó la propuesta. Carga recomendada superada: ${resultado.advertenciasHoras.map((aviso) => `${aviso.periodo.etiqueta}: ${aviso.total} h (recomendadas: ${aviso.limite} h)`).join('; ')}.`,
      } : null,
    });

    await db.courses.bulkPut(cursosOrdenados);
    await get().setTotalCiclos(Math.max(get().totalCiclos, resultado.cicloFinal));
  },

  generarPlanificacionOptima: async () => {
    const resultado = get().previsualizarPlanificacionOptima();
    await get().aplicarPlanificacionOptima(resultado);
    const cursosOrdenados = get().cursos;
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
    const tarifarioNormalizado = migrateLegacyFinancialRulesReference(tarifario);
    const disciplinas = Object.keys(tarifarioNormalizado.disciplinas);
    const disciplinaActual = get().disciplinaActiva;
    const disciplinaValida = disciplinas.includes(disciplinaActual)
      ? disciplinaActual
      : (disciplinas[0] ?? disciplinaActual);

    set({ tarifario: tarifarioNormalizado, disciplinaActiva: disciplinaValida });
    await db.customCosts.put(tarifarioNormalizado);

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
      ...perfilActual,
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
    const cursosNormalizados = ordenarCursos(get().cicloActual
      ? ubicarAvanceEnCicloActual(cursosImportados.map(normalizarCurso), get().cicloActual!, get().periodoIngreso)
      : cursosImportados.map(normalizarCurso));
    const nombreArchivoCargado = get().nombreArchivoCargado ?? 'Respaldo académico';
    set({ cursos: cursosNormalizados, totalCiclos: determinarTotalCiclos(cursosNormalizados, get().totalCiclos), ciclosExcluidos: [], cursoAMover: null, nombreArchivoCargado });
    await db.transaction('rw', db.courses, db.profile, async () => {
      await db.courses.clear();
      await db.courses.bulkPut(cursosNormalizados);
      const perfil = await db.profile.get('current_profile');
      await db.profile.put({
        ...perfil,
        id: 'current_profile',
        universidadId: perfil?.universidadId ?? get().tarifario?.universidadId ?? 'pe-utp',
        carrera: perfil?.carrera ?? 'Ingeniería de Sistemas e Informática',
        disciplinaActiva: perfil?.disciplinaActiva ?? get().disciplinaActiva,
        fechaActualizacion: new Date().toISOString(),
        nombreArchivoCargado,
        totalCiclos: get().totalCiclos,
        ciclosExcluidos: [],
      });
    });
  },

  cargarDesdeDB: async () => {
    const cursosDB = await db.courses.toArray();
    const tarifariosDB = await db.customCosts.toArray();
    const profileDB = await db.profile.get('current_profile');

    if (cursosDB.length > 0) {
      const cursosNormalizados = ordenarCursos(profileDB?.cicloActual
        ? ubicarAvanceEnCicloActual(cursosDB.map(normalizarCurso), profileDB.cicloActual, profileDB.periodoIngreso)
        : cursosDB.map(normalizarCurso));
      set({ cursos: cursosNormalizados });

      const necesitaMigracion = cursosDB.some((curso) => {
        const ubicacion = curso.ubicacion as string | undefined;
        return !curso.cicloOrigen || !curso.tipoPeriodo || !ubicacion || ubicacion === 'ciclo';
      });
      const normalizadosPorCodigo = new Map(cursosNormalizados.map((curso) => [curso.codigo, curso]));
      if (necesitaMigracion || cursosDB.some((curso) =>
        curso.ciclo !== normalizadosPorCodigo.get(curso.codigo)?.ciclo ||
        curso.tipoPeriodo !== normalizadosPorCodigo.get(curso.codigo)?.tipoPeriodo)) {
        await db.courses.bulkPut(cursosNormalizados);
      }
    }

    if (tarifariosDB.length > 0) {
      const tarifarioPersistido = tarifariosDB[0];
      const tarifarioMigrado = migrateLegacyFinancialRulesReference(tarifarioPersistido);
      set({ tarifario: tarifarioMigrado });

      if (tarifarioMigrado !== tarifarioPersistido) {
        await db.customCosts.put(tarifarioMigrado);
      }
    }
    if (profileDB) {
      set({
        disciplinaActiva: profileDB.disciplinaActiva,
        nombreArchivoCargado: profileDB.nombreArchivoCargado ?? null,
        periodoIngreso: profileDB.periodoIngreso ?? null,
        cicloActual: profileDB.cicloActual ?? null,
      });
    }
    set({
      totalCiclos: determinarTotalCiclos(get().cursos, Math.max(
        normalizarTotalCiclos(profileDB?.totalCiclos ?? CICLOS_INICIALES),
        profileDB?.cicloActual ?? 1
      )),
      ciclosExcluidos: normalizarCiclosExcluidos(profileDB?.ciclosExcluidos).filter((ciclo) =>
        ciclo > (profileDB?.cicloActual ?? 0) && !get().cursos.some((curso) =>
          curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === ciclo)),
      perfilCargado: true,
    });
  },
}));
