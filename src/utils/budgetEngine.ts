import type {
  Curso,
  RangoTarifario,
  ResumenFinanciero,
  Tarifario,
  TipoPeriodoAcademico,
} from '../types/academic';

export interface OpcionesPresupuesto {
  metodoPago?: string;
  tipoPeriodo?: TipoPeriodoAcademico;
  pagoUnico?: boolean;
}

const redondearMoneda = (valor: number): number =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

const obtenerTarifas = (tarifario: Tarifario, disciplinaActiva: string) =>
  tarifario.disciplinas[disciplinaActiva] || Object.values(tarifario.disciplinas)[0];

const obtenerRango = (rangos: RangoTarifario[], horas: number) =>
  rangos.find((rango) => horas >= rango.minHoras && horas <= rango.maxHoras);

const calcularCuotaEscalaFija = (
  horas: number,
  rangos: RangoTarifario[],
  costoHoraAdicional: number
) => {
  if (horas <= 0) return { cuota: 0, horasExceso: 0, costoHorasExceso: 0 };

  const rango = obtenerRango(rangos, horas);
  if (rango) return { cuota: rango.montoCuota, horasExceso: 0, costoHorasExceso: 0 };

  const ultimoRango = [...rangos].sort((a, b) => b.maxHoras - a.maxHoras)[0];
  if (!ultimoRango) return { cuota: 0, horasExceso: 0, costoHorasExceso: 0 };

  const horasExceso = Math.max(0, horas - ultimoRango.maxHoras);
  const costoHorasExceso = horasExceso * costoHoraAdicional;

  return {
    cuota: ultimoRango.montoCuota + costoHorasExceso,
    horasExceso,
    costoHorasExceso,
  };
};

const calcularCuotaBaseRegular = (
  cursos: Curso[],
  tarifario: Tarifario,
  disciplinaActiva: string
) => {
  const tarifas = obtenerTarifas(tarifario, disciplinaActiva);
  const creditos = cursos.reduce((s, c) => s + c.creditos, 0);
  const horas = cursos.reduce((s, c) => s + c.horasSemanales, 0);

  switch (tarifario.modalidadPrincipal) {
    case 'ESCALA_FIJA': {
      const r = calcularCuotaEscalaFija(
        horas,
        tarifas.rangosPension ?? [],
        tarifas.costoHoraAdicional ?? 0
      );
      return { ...r, horas };
    }
    case 'POR_CREDITO':
      return { cuota: creditos * tarifas.costoPorCredito, horas, horasExceso: 0, costoHorasExceso: 0 };
    case 'POR_HORA':
      return {
        cuota: horas * tarifas.costoPorHora * Math.max(1, tarifario.semanasPorCiclo),
        horas,
        horasExceso: 0,
        costoHorasExceso: 0,
      };
    case 'POR_CURSO':
      return { cuota: cursos.length * tarifas.costoPorCurso, horas, horasExceso: 0, costoHorasExceso: 0 };
    default:
      return { cuota: creditos * tarifas.costoPorCredito, horas, horasExceso: 0, costoHorasExceso: 0 };
  }
};

export const calcularPresupuesto = (
  cursosSeleccionados: Curso[],
  tarifario: Tarifario,
  disciplinaActiva: string,
  opciones: OpcionesPresupuesto = {}
): ResumenFinanciero => {
  const tarifas = obtenerTarifas(tarifario, disciplinaActiva);
  const totalCreditos = cursosSeleccionados.reduce((sum, c) => sum + c.creditos, 0);
  const tipoPeriodo = opciones.tipoPeriodo ?? 'REGULAR';
  const baseRegular = calcularCuotaBaseRegular(cursosSeleccionados, tarifario, disciplinaActiva);

  const esVerano = tipoPeriodo === 'VERANO';

  const horasTarifarias = esVerano ? baseRegular.horas * 2 : baseRegular.horas;

  const baseCalculada = esVerano
    ? calcularCuotaEscalaFija(horasTarifarias, tarifas.rangosPension ?? [], tarifas.costoHoraAdicional ?? 0)
    : baseRegular;

  const cuotaAntesDescuento = esVerano ? baseCalculada.cuota : baseRegular.cuota;

  const metodoPago = !esVerano && opciones.metodoPago
    ? tarifario.metodosPago?.[opciones.metodoPago]
    : undefined;

  const descuentoBanco = metodoPago?.descuentoPorcentaje ?? 0;
  const usaPagoUnico = !esVerano && opciones.pagoUnico === true;

  const numeroCuotas = esVerano
    ? Math.max(1, tarifario.cuotasPorVerano ?? 2)
    : Math.max(1, tarifario.cuotasPorCiclo);

  const cuotaBase = redondearMoneda(cuotaAntesDescuento);
  const totalCuotasAntesDescuento = redondearMoneda(cuotaBase * numeroCuotas);

  const descuentoPagoUnico = usaPagoUnico
    ? tarifario.descuentoPagoUnicoRegular ?? 7.5
    : 0;

  const descuentoPorcentaje = usaPagoUnico ? descuentoPagoUnico : descuentoBanco;

  // Pronto pago se aplica sobre la pensión base (cuota base), no sobre un total agregado.
  const descuentoMontoPorCuota = redondearMoneda(
    cuotaBase * (descuentoPorcentaje / 100)
  );

  const montoPorCuota = usaPagoUnico
    ? redondearMoneda(cuotaBase)
    : redondearMoneda(cuotaBase - descuentoMontoPorCuota);

  const descuentoPagoUnicoMonto = usaPagoUnico
    ? redondearMoneda(totalCuotasAntesDescuento * (descuentoPagoUnico / 100))
    : 0;

  const costoMatricula =
    tipoPeriodo === 'VERANO'
      ? Math.max(0, tarifario.costoMatriculaVerano ?? 0)
      : tarifas.costoMatriculaRegular;

  const costoEnsenanzaTotal = redondearMoneda(
    usaPagoUnico
      ? totalCuotasAntesDescuento - descuentoPagoUnicoMonto
      : montoPorCuota * numeroCuotas
  );

  const costoLaboratorios = redondearMoneda(
    cursosSeleccionados.filter((c) => c.esLaboratorio).length *
      tarifas.costoFijoLaboratorio
  );

  const costoTotalCiclo = redondearMoneda(
    costoMatricula + costoEnsenanzaTotal + costoLaboratorios
  );

  return {
    totalCreditos,
    totalHorasSemanales: baseRegular.horas,
    horasTarifarias,
    tipoPeriodo,
    costoMatricula,
    cuotaBase,
    descuentoPorcentaje,
    descuentoMontoPorCuota,
    costoEnsenanzaTotal,
    costoTotalCiclo,
    montoPorCuota,
    numeroCuotas,
    horasExceso: baseCalculada.horasExceso,
    costoHorasExcesoPorCuota: redondearMoneda(baseCalculada.costoHorasExceso),
    pagoUnico: usaPagoUnico,
    descuentoPagoUnicoMonto,
  };
};
