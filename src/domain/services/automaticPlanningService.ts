import { obtenerPeriodoCurso } from '../rules/academicPeriodRules';
import { calcularHorasEfectivas, LIMITE_HORAS_PLANIFICACION } from '../rules/planningRules';
import { horasValidas } from './planning/unplannedReasons';
import type { ResultadoPlanificacionAutomatica } from './planning/types';

export { generarPlanificacionAutomatica } from './planning/planBuilder';
export type {
  CicloPlanificadoResumen, CursoNoPlanificado, CursoPlanificadoResumen,
  ExplicacionPlan, MotivoNoPlanificado, ResultadoPlanificacionAutomatica,
} from './planning/types';

/** Verifica la carga real de los ciclos modificados antes de guardar la propuesta. */
export const validarCargaPlanificacionAutomatica = (resultado: ResultadoPlanificacionAutomatica): void => {
  for (const ciclo of resultado.ciclos) {
    const carga = resultado.cursos.filter((curso) => curso.ubicacion === 'periodo' &&
      (curso.estado === 'PENDIENTE' || curso.estado === 'EN_CURSO') && obtenerPeriodoCurso(curso).id === ciclo.periodo.id);
    if (ciclo.periodo.tipo !== 'REGULAR' || carga.some((curso) => !horasValidas(curso)) ||
        calcularHorasEfectivas(carga, 'REGULAR') > LIMITE_HORAS_PLANIFICACION) {
      throw new Error(`La propuesta supera las ${LIMITE_HORAS_PLANIFICACION} horas o contiene una carga inválida en ${ciclo.periodo.etiqueta}. Genera una propuesta nueva.`);
    }
  }
};
