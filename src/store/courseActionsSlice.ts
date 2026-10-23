import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { moveCourseUseCase } from '../application/usecases/moveCourseUseCase';
import { crearPeriodoRegular, crearPeriodoVerano, obtenerPeriodoCurso } from '../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual, ubicarAvanceEnCicloActual } from '../domain/rules/academicContextRules';
import { cursoBloqueado, esJaladoSinReplanificar, ordenarCursos } from '../domain/rules/courseRules';
import { obtenerHorasSinRecargo } from '../domain/rules/planningRules';
import { detectarNuevosConflictosDescendientes } from '../domain/services/prerequisiteService';
import {
  destinoJaladoPermitido, devolverJaladoAOrigen, esCursoJalado, esRegresoAlOrigen, jaladosFaltantes,
  mensajeJaladoObligatorio,
  periodoRecuperacion, planificadosSinJalado,
} from '../domain/rules/jaladoRules';
import {
  notificacionDesdeResultado, notificacionErrorPersistencia, notificacionJalado, notificacionJaladoRetirado,
  notificacionPeriodoBloqueado, notificacionPorConflictos,
} from '../presentation/messages/movementMessages';
import type { AcademicSlice, AcademicStore } from './types';

type CourseActionsSlice = Pick<AcademicStore,
  'marcarComoJalado' | 'desmarcarJalado' | 'moverCursoAPeriodo' | 'moverCursoACiclo' |
  'moverCursoAVerano' | 'moverCursoABanco' | 'agregarJaladosARecuperacion' | 'reiniciarPlanificacion'>;

export const createCourseActionsSlice = (repos: AcademicRepositories): AcademicSlice<CourseActionsSlice> => (set, get) => ({
  marcarComoJalado: async (codigo) => {
    const state = get();
    const cursoActual = state.cursos.find((curso) => curso.codigo === codigo);
    if (!cursoActual || cursoActual.estado !== 'EN_CURSO') return null;
    // Queda en su ciclo, desbloqueado para moverse; no se mueve ningún otro curso.
    const cambios = { estado: 'PENDIENTE' as const, jalado: true, cicloJalado: cursoActual.ciclo,
      ubicacion: 'periodo' as const, ciclo: cursoActual.ciclo, tipoPeriodo: cursoActual.tipoPeriodo };
    const cursosActualizados = ordenarCursos(state.cursos.map((curso) =>
      curso.codigo === codigo ? { ...curso, ...cambios } : curso));
    const invalidos = detectarNuevosConflictosDescendientes(state.cursos, cursosActualizados, codigo, state);
    try {
      await repos.courses.update(codigo, cambios);
      set({ cursos: cursosActualizados, cursoAMover: null,
        notificacionMovimiento: notificacionJalado(cursoActual, invalidos,
          periodoRecuperacion(cursosActualizados, state)?.cicloReferencia ?? null) });
      return invalidos;
    } catch {
      set({ notificacionMovimiento: notificacionErrorPersistencia(cursoActual.nombre) });
      return null;
    }
  },

  desmarcarJalado: async (codigo) => {
    const state = get();
    const cursoActual = state.cursos.find((curso) => curso.codigo === codigo);
    if (!cursoActual?.jalado) return false;
    const enCurso = { ...cursoActual, estado: 'EN_CURSO' as const, jalado: undefined, cicloJalado: undefined,
      ubicacion: 'periodo' as const };
    const restaurado = state.cicloActual
      ? ubicarAvanceEnCicloActual([enCurso], state.cicloActual, state.periodoIngreso)[0] : enCurso;
    const cursosActualizados = ordenarCursos(state.cursos.map((curso) => curso.codigo === codigo ? restaurado : curso));
    try {
      await repos.courses.update(codigo, { estado: 'EN_CURSO', jalado: undefined, cicloJalado: undefined,
        ubicacion: restaurado.ubicacion,
        ciclo: restaurado.ciclo, tipoPeriodo: restaurado.tipoPeriodo });
      set({ cursos: cursosActualizados, cursoAMover: null, notificacionMovimiento: null });
      return true;
    } catch {
      set({ notificacionMovimiento: notificacionErrorPersistencia(cursoActual.nombre) });
      return false;
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
    // Sacar un jalado de su periodo de recuperación invalida lo planificado desde allí.
    const avisoJalado = esRegresoAlOrigen(curso, periodo, state.cursos, state)
      ? notificacionJaladoRetirado(curso.nombre, planificadosSinJalado(cursosActualizados, state),
        periodoRecuperacion(cursosActualizados, state)?.cicloReferencia ?? null)
      : null;
    try {
      await repos.courses.update(codigo, {
        ciclo: actualizado.ciclo, tipoPeriodo: actualizado.tipoPeriodo,
        ubicacion: actualizado.ubicacion,
      });
      set({ cursos: cursosActualizados, cursoAMover: null,
        notificacionMovimiento: avisoJalado ?? notificacionPorConflictos(curso.nombre, afectados, 'mover', avisoHoras) });
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
    if (!destinoJaladoPermitido(curso, 'banco', state.cursos, state)) {
      set({ notificacionMovimiento: { tipo: 'JALADO_OBLIGATORIO', cursoNombre: curso.nombre,
        mensaje: mensajeJaladoObligatorio(state.cursos, state) } });
      return false;
    }
    if (state.cicloActual && curso.ubicacion === 'periodo' && !esJaladoSinReplanificar(curso, state.cicloActual) &&
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

  agregarJaladosARecuperacion: async () => {
    const state = get();
    const destino = periodoRecuperacion(state.cursos, state);
    if (!destino) return false;
    let todos = true;
    for (const jalado of jaladosFaltantes(state.cursos, state)) {
      todos = await get().moverCursoAPeriodo(jalado.codigo, destino) && todos;
    }
    return todos;
  },

  reiniciarPlanificacion: async () => {
    const state = get();
    const cursosActualizados = ordenarCursos(state.cursos.map((curso) => {
      if (curso.estado !== 'PENDIENTE' ||
          (state.cicloActual && curso.ubicacion === 'periodo' &&
           periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), state.cicloActual))) return curso;
      // Un jalado replanificado vuelve a su ciclo original, no al banco.
      if (esCursoJalado(curso) && state.cicloActual) return devolverJaladoAOrigen(curso, state.cicloActual);
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
