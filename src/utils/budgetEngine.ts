import type { Curso, Tarifario, ResumenFinanciero } from '../types/academic';

export const calcularPresupuesto = (
  cursosSeleccionados: Curso[],
  tarifario: Tarifario,
  disciplinaActiva: string
): ResumenFinanciero => {
  // Obtiene las tarifas de la disciplina activa o usa la primera disponible
  const tarifas = tarifario.disciplinas[disciplinaActiva] || Object.values(tarifario.disciplinas)[0];

  const totalCreditos = cursosSeleccionados.reduce((sum, c) => sum + c.creditos, 0);
  const totalHorasSemanales = cursosSeleccionados.reduce((sum, c) => sum + c.horasSemanales, 0);

  let costoEnsenanzaTotal = 0;

  switch (tarifario.modalidadPrincipal) {
    case 'POR_CREDITO':
      costoEnsenanzaTotal = totalCreditos * tarifas.costoPorCredito;
      break;
    case 'POR_HORA':
      costoEnsenanzaTotal = totalHorasSemanales * tarifas.costoPorHora * tarifario.semanasPorCiclo;
      break;
    case 'POR_CURSO':
      costoEnsenanzaTotal = cursosSeleccionados.length * tarifas.costoPorCurso;
      break;
    default:
      costoEnsenanzaTotal = totalCreditos * tarifas.costoPorCredito;
  }

  const costoLaboratorios = cursosSeleccionados
    .filter((c) => c.esLaboratorio)
    .length * tarifas.costoFijoLaboratorio;

  const costoTotalCiclo = tarifas.costoMatriculaRegular + costoEnsenanzaTotal + costoLaboratorios;
  const montoPorCuota = tarifario.cuotasPorCiclo > 0 
    ? costoEnsenanzaTotal / tarifario.cuotasPorCiclo 
    : 0;

  return {
    totalCreditos,
    totalHorasSemanales,
    costoMatricula: tarifas.costoMatriculaRegular,
    costoEnsenanzaTotal,
    costoTotalCiclo,
    montoPorCuota
  };
};