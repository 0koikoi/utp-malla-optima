import type { Curso, PeriodoAcademico } from '../../../types/academic';
import { obtenerPeriodoCurso } from '../../rules/academicPeriodRules';

const ESTADOS_COMPLETADOS = new Set(['APROBADO', 'CONVALIDADO']);

export const requisitoCumplidoAntesDe = (
  requisito: Curso, destino: PeriodoAcademico, asignaciones: Map<string, PeriodoAcademico>
): boolean => {
  if (ESTADOS_COMPLETADOS.has(requisito.estado)) return true;
  if (requisito.estado === 'EN_CURSO' && requisito.ubicacion === 'periodo') {
    return obtenerPeriodoCurso(requisito).orden < destino.orden;
  }
  const asignacion = asignaciones.get(requisito.codigo);
  return asignacion !== undefined && asignacion.orden < destino.orden;
};

export const prerrequisitosCumplidos = (
  curso: Curso, destino: PeriodoAcademico,
  porCodigo: Map<string, Curso>, asignaciones: Map<string, PeriodoAcademico>
): boolean => curso.prerrequisitos.every((codigo) => {
  const requisito = porCodigo.get(codigo);
  return !requisito || requisitoCumplidoAntesDe(requisito, destino, asignaciones);
});
