import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { generateOptimalPlanUseCase } from '../application/usecases/generateOptimalPlanUseCase';
import { determinarTotalCiclos } from '../domain/rules/cycleRules';
import { ordenarCursos } from '../domain/rules/courseRules';
import { validarCargaPlanificacionAutomatica } from '../domain/services/automaticPlanningService';
import { notificacionPlanAplicado } from '../presentation/messages/movementMessages';
import type { AcademicSlice, AcademicStore } from './types';

type PlanningSlice = Pick<AcademicStore,
  'cursosSeleccionadosParaMatricula' | 'previsualizarPlanificacionOptima' |
  'aplicarPlanificacionOptima' | 'generarPlanificacionOptima' | 'toggleSeleccionMatricula'>;

export const createPlanningSlice = (repos: AcademicRepositories): AcademicSlice<PlanningSlice> => (set, get) => ({
  cursosSeleccionadosParaMatricula: [],

  previsualizarPlanificacionOptima: () => {
    const { cursos, totalCiclos, ciclosExcluidos, cicloActual, periodoIngreso } = get();
    return generateOptimalPlanUseCase({ cursos, totalCiclos, ciclosExcluidos, cicloActual, periodoIngreso });
  },

  aplicarPlanificacionOptima: async (resultado) => {
    const state = get();
    const actuales = state.cursos;
    if (resultado.cursos.length !== actuales.length ||
        resultado.cursos.some((curso) => !actuales.some((actual) => actual.codigo === curso.codigo))) {
      throw new Error('La malla cambió desde que se generó la propuesta. Genera una propuesta nueva.');
    }
    validarCargaPlanificacionAutomatica(resultado);
    if (resultado.cursos.some((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' &&
        state.ciclosExcluidos.includes(curso.ciclo))) {
      throw new Error('La propuesta utiliza un ciclo retirado. Genera una propuesta nueva.');
    }
    const cursos = ordenarCursos(resultado.cursos);
    const totalCiclos = determinarTotalCiclos(cursos, Math.max(state.totalCiclos, resultado.cicloFinal));
    await repos.transaction(async () => {
      await repos.courses.saveMany(cursos);
      await repos.profile.save({ totalCiclos });
    });
    set({ cursos, totalCiclos, cursosSeleccionadosParaMatricula: [], cursoAMover: null,
      notificacionMovimiento: notificacionPlanAplicado(resultado.advertenciasHoras) });
  },

  generarPlanificacionOptima: async () => {
    const resultado = get().previsualizarPlanificacionOptima();
    await get().aplicarPlanificacionOptima(resultado);
    return { ...resultado, cursos: get().cursos };
  },

  toggleSeleccionMatricula: (codigo) => {
    const actual = get().cursosSeleccionadosParaMatricula;
    const existe = actual.includes(codigo);
    set({ cursosSeleccionadosParaMatricula: existe
      ? actual.filter((item) => item !== codigo) : [...actual, codigo] });
  },
});
