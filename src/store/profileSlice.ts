import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { DEFAULT_PROFILE } from '../config/defaultProfile';
import { detectarNuevosConflictosDescendientes } from '../domain/services/prerequisiteService';
import { cursoBloqueado, ordenarCursos } from '../domain/rules/courseRules';
import { ubicarAvanceEnCicloActual } from '../domain/rules/academicContextRules';
import { determinarPeriodoEnCurso } from '../domain/rules/academicPeriodRules';
import { CICLOS_INICIALES, MAXIMO_CICLOS, determinarTotalCiclos, normalizarCiclosExcluidos, obtenerSiguienteCiclo } from '../domain/rules/cycleRules';
import { notificacionPorConflictos } from '../presentation/messages/movementMessages';
import type { AcademicSlice, AcademicStore } from './types';

type ProfileSlice = Pick<AcademicStore,
  'disciplinaActiva' | 'periodoIngreso' | 'cicloActual' | 'totalCiclos' | 'ciclosExcluidos' |
  'perfilCargado' | 'setTotalCiclos' | 'agregarCiclo' | 'eliminarCiclo' |
  'setContextoAcademico' | 'setDisciplinaActiva'>;

let cambiosCiclos = Promise.resolve();
const guardarCambioCiclos = <T>(cambio: () => Promise<T>): Promise<T> => {
  const resultado = cambiosCiclos.then(cambio);
  cambiosCiclos = resultado.then(() => undefined, () => undefined);
  return resultado;
};

export const createProfileSlice = (repos: AcademicRepositories): AcademicSlice<ProfileSlice> => (set, get) => ({
  disciplinaActiva: DEFAULT_PROFILE.disciplinaActiva,
  periodoIngreso: null,
  cicloActual: null,
  totalCiclos: CICLOS_INICIALES,
  ciclosExcluidos: [],
  perfilCargado: false,

  setTotalCiclos: async (total) => {
    if (!Number.isFinite(total)) return;
    const state = get();
    const totalCiclos = determinarTotalCiclos(state.cursos, Math.max(total, state.cicloActual ?? 1));
    await repos.profile.save({
      ...(state.tarifario ? { universidadId: state.tarifario.universidadId } : {}),
      disciplinaActiva: state.disciplinaActiva,
      nombreArchivoCargado: state.nombreArchivoCargado ?? undefined,
      periodoIngreso: state.periodoIngreso ?? undefined,
      cicloActual: state.cicloActual ?? undefined,
      totalCiclos,
      ciclosExcluidos: state.ciclosExcluidos,
    });
    set({ totalCiclos });
  },

  agregarCiclo: () => guardarCambioCiclos(async () => {
    const state = get();
    const siguiente = obtenerSiguienteCiclo(state.totalCiclos, state.ciclosExcluidos);
    if (siguiente === null) return;
    const ciclosExcluidos = state.ciclosExcluidos.filter((ciclo) => ciclo !== siguiente);
    const totalCiclos = Math.max(state.totalCiclos, siguiente);
    await repos.profile.save({ totalCiclos, ciclosExcluidos });
    set({ totalCiclos, ciclosExcluidos });
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
    await repos.transaction(async () => {
      if (cursosCiclo.length) await repos.courses.saveMany(cursos);
      await repos.profile.save({ ciclosExcluidos, totalCiclos: state.totalCiclos });
    });
    set({ cursos, ciclosExcluidos, cursoAMover: null,
      cursosSeleccionadosParaMatricula: state.cursosSeleccionadosParaMatricula.filter((codigo) => !retirados.has(codigo)),
      notificacionMovimiento: notificacionPorConflictos(`Ciclo ${ciclo}`, afectados, 'ciclo') });
    return true;
  }),

  setContextoAcademico: async (periodoIngreso, ciclo) => {
    const state = get();
    const cicloActual = Math.max(1, Math.min(MAXIMO_CICLOS, Math.trunc(ciclo)));
    const cursos = ordenarCursos(ubicarAvanceEnCicloActual(state.cursos, cicloActual, periodoIngreso));
    const totalCiclos = determinarTotalCiclos(cursos, Math.max(state.totalCiclos, cicloActual));
    const ciclosExcluidos = state.ciclosExcluidos.filter((numero) => numero > cicloActual &&
      !cursos.some((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === numero));
    await repos.transaction(async () => {
      await repos.profile.save({ periodoIngreso, cicloActual, totalCiclos, ciclosExcluidos,
        disciplinaActiva: state.disciplinaActiva,
        nombreArchivoCargado: state.nombreArchivoCargado ?? undefined });
      await repos.courses.saveMany(cursos);
    });
    set({ periodoIngreso, cicloActual, totalCiclos, ciclosExcluidos, cursos, cursoAMover: null });
  },

  setDisciplinaActiva: async (disciplinaActiva) => {
    const tarifario = get().tarifario;
    await repos.profile.save({ disciplinaActiva,
      ...(tarifario ? { universidadId: tarifario.universidadId } : {}) });
    set({ disciplinaActiva });
  },
});
