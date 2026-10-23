import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { moveCourseUseCase } from '../application/usecases/moveCourseUseCase';
import { crearPeriodoRegular, crearPeriodoVerano, obtenerPeriodoCurso } from '../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual, ubicarAvanceEnCicloActual } from '../domain/rules/academicContextRules';
import { cursoBloqueado, ordenarCursos } from '../domain/rules/courseRules';
import { obtenerHorasSinRecargo } from '../domain/rules/planningRules';
import { detectarNuevosConflictosDescendientes } from '../domain/services/prerequisiteService';
import {
  notificacionDesdeResultado, notificacionErrorPersistencia,
  notificacionPeriodoBloqueado, notificacionPorConflictos,
} from '../presentation/messages/movementMessages';
import type { AcademicSlice, AcademicStore } from './types';

type CourseActionsSlice = Pick<AcademicStore,
  'updateEstadoCurso' | 'moverCursoAPeriodo' | 'moverCursoACiclo' |
  'moverCursoAVerano' | 'moverCursoABanco' | 'reiniciarPlanificacion'>;

export const createCourseActionsSlice = (repos: AcademicRepositories): AcademicSlice<CourseActionsSlice> => (set, get) => ({
  updateEstadoCurso: async (codigo, nuevoEstado) => {
    const state = get();
    const cursoActual = state.cursos.find((curso) => curso.codigo === codigo);
    if (!cursoActual) return;
    const ubicacion = cursoBloqueado({ ...cursoActual, estado: nuevoEstado })
      ? 'periodo' as const : cursoActual.ubicacion;
    const cursosActualizados = ordenarCursos(state.cursos.map((curso) => {
      if (curso.codigo !== codigo) return curso;
      const actualizado = { ...curso, estado: nuevoEstado, ubicacion };
      return state.cicloActual
        ? ubicarAvanceEnCicloActual([actualizado], state.cicloActual, state.periodoIngreso)[0]
        : actualizado;
    }));
    const actualizado = cursosActualizados.find((curso) => curso.codigo === codigo)!;
    try {
      await repos.courses.update(codigo, {
        estado: nuevoEstado, ubicacion: actualizado.ubicacion,
        ciclo: actualizado.ciclo, tipoPeriodo: actualizado.tipoPeriodo,
      });
      set({ cursos: cursosActualizados });
    } catch {
      set({ notificacionMovimiento: notificacionErrorPersistencia(cursoActual.nombre) });
    }
  },

  moverCursoAPeriodo: async (codigo, periodo) => {
    const state = get();
    const curso = state.cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;
    const resultado = moveCourseUseCase(state.cursos, codigo, periodo, {
      cicloActual: state.cicloActual, periodoIngreso: state.periodoIngreso,
      ciclosExcluidos: state.ciclosExcluidos,
      horasSinRecargo: obtenerHorasSinRecargo(state.tarifario, state.disciplinaActiva),
    });
    if (!resultado.ok) {
      set({ notificacionMovimiento: notificacionDesdeResultado(curso, periodo, resultado) });
      return false;
    }
    const cursosActualizados = ordenarCursos(resultado.cursos);
    const actualizado = cursosActualizados.find((item) => item.codigo === codigo)!;
    const afectados = detectarNuevosConflictosDescendientes(state.cursos, cursosActualizados, codigo, state);
    const avisoHoras = notificacionDesdeResultado(curso, periodo, resultado);
    try {
      await repos.courses.update(codigo, {
        ciclo: actualizado.ciclo, tipoPeriodo: actualizado.tipoPeriodo,
        ubicacion: actualizado.ubicacion,
      });
      set({ cursos: cursosActualizados, cursoAMover: null,
        notificacionMovimiento: notificacionPorConflictos(curso.nombre, afectados, 'mover', avisoHoras) });
      return true;
    } catch {
      set({ notificacionMovimiento: notificacionErrorPersistencia(curso.nombre) });
      return false;
    }
  },

  moverCursoACiclo: async (codigo, nuevoCiclo) =>
    get().moverCursoAPeriodo(codigo, crearPeriodoRegular(nuevoCiclo)),

  moverCursoAVerano: async (codigo, despuesDelCiclo) =>
    get().moverCursoAPeriodo(codigo, crearPeriodoVerano(despuesDelCiclo)),

  moverCursoABanco: async (codigo) => {
    const state = get();
    const curso = state.cursos.find((item) => item.codigo === codigo);
    if (!curso) return false;
    if (cursoBloqueado(curso)) {
      set({ notificacionMovimiento: { tipo: 'INMOVIBLE', cursoNombre: curso.nombre } });
      return false;
    }
    if (state.cicloActual && curso.ubicacion === 'periodo' &&
        periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), state.cicloActual)) {
      set({ notificacionMovimiento: notificacionPeriodoBloqueado(curso.nombre) });
      return false;
    }
    const cursosActualizados = ordenarCursos(state.cursos.map((item) => item.codigo === codigo
      ? { ...item, ciclo: item.cicloOrigen, tipoPeriodo: 'REGULAR' as const, ubicacion: 'banco' as const }
      : item));
    const afectados = detectarNuevosConflictosDescendientes(state.cursos, cursosActualizados, codigo, state);
    try {
      await repos.courses.update(codigo, {
        ciclo: curso.cicloOrigen, tipoPeriodo: 'REGULAR', ubicacion: 'banco',
      });
      set({ cursos: cursosActualizados, cursoAMover: null,
        notificacionMovimiento: notificacionPorConflictos(curso.nombre, afectados, 'retirar') });
      return true;
    } catch {
      set({ notificacionMovimiento: notificacionErrorPersistencia(curso.nombre) });
      return false;
    }
  },

  reiniciarPlanificacion: async () => {
    const state = get();
    const cursosActualizados = ordenarCursos(state.cursos.map((curso) => {
      if (curso.estado !== 'PENDIENTE' ||
          (state.cicloActual && curso.ubicacion === 'periodo' &&
           periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), state.cicloActual))) return curso;
      return { ...curso, ciclo: curso.cicloOrigen, tipoPeriodo: 'REGULAR' as const, ubicacion: 'banco' as const };
    }));
    try {
      await repos.courses.saveMany(cursosActualizados);
      set({ cursos: cursosActualizados, cursosSeleccionadosParaMatricula: [],
        cursoAMover: null, notificacionMovimiento: null });
    } catch {
      set({ notificacionMovimiento: notificacionErrorPersistencia('Planificación') });
    }
  },
});
