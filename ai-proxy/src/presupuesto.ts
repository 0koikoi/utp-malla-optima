import type { AIContext, AIDerivados, AIEscenarioPeriodo } from './contracts.js';

/**
 * Cálculos del presupuesto del contexto del asistente (D-001). Funciones puras compartidas: las usa
 * buildAIContext y el proxy (aplicarMontoDelAlumno). ai-proxy/src/presupuesto.ts es una copia exacta; un test
 * falla si difieren. Solo puede importar tipos de contracts.ts.
 */

export const r2 = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
export const positivo = (valor: number) => r2(Math.max(0, valor));

/** derivados.presupuesto: cada escenario mensual contra el presupuesto (el pago único no tiene cuota mensual). */
export const presupuestoPorEscenario = (escenarios: AIEscenarioPeriodo[], presupuesto: number | null): AIDerivados['presupuesto'] =>
  presupuesto === null ? null : escenarios.flatMap((escenario) => {
    if (escenario.cuotaMensual === null) return [];
    const diferenciaMes = r2(presupuesto - escenario.cuotaMensual);
    const diferenciaCiclo = r2(diferenciaMes * escenario.numeroCuotas);
    return [{
      id: escenario.id,
      alcanza: diferenciaMes >= 0,
      diferenciaMes,
      faltaPorMes: positivo(-diferenciaMes),
      sobraPorMes: positivo(diferenciaMes),
      diferenciaCiclo,
      faltaPorCiclo: positivo(-diferenciaCiclo),
      sobraPorCiclo: positivo(diferenciaCiclo),
    }];
  });

/** Comparación referencial del pago único: presupuesto × número de cuotas - pensión al inicio. */
export const comparacionPagoUnico = (pensionAlInicio: number, presupuesto: number | null, numeroCuotas: number) => ({
  diferenciaVsPresupuestoDelCiclo: presupuesto === null ? null : r2(presupuesto * numeroCuotas - pensionAlInicio),
  comparacion: presupuesto === null ? null : 'comparación referencial' as const,
});

/** derivados.pagoUnico: solo restas hechas en código sobre los montos de FinancialPlanningService. */
export const pagoUnicoDe = (escenarios: AIEscenarioPeriodo[], presupuesto: number | null, pensionAlInicio: number | null): AIDerivados['pagoUnico'] => {
  const unico = escenarios.find((escenario) => escenario.id === 'pago_unico');
  const sinDescuento = escenarios.find((escenario) => escenario.id === 'sin_descuento');
  if (!unico || !sinDescuento || pensionAlInicio === null) return null;
  return {
    pensionAlInicio,
    matricula: unico.matricula,
    totalCiclo: unico.total,
    ahorroVsSinDescuento: r2(sinDescuento.total - unico.total),
    ...comparacionPagoUnico(pensionAlInicio, presupuesto, unico.numeroCuotas),
  };
};

const NUMERO = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?`;
/** "S/ 800", "800 soles", "con 800 al mes", "800 mensuales", "con 1000" (no "con 4 h" ni "con 3 cursos"). */
const MONTOS = [
  new RegExp(String.raw`S\/\.?\s?${NUMERO}`, 'i'),
  new RegExp(String.raw`\b${NUMERO}\s*(?:soles|al mes|mensuales|por mes|cada mes)\b`, 'i'),
  new RegExp(String.raw`\bcon\s+${NUMERO}(?!\s*(?:h\b|horas?|cr[eé]ditos?|cursos?|ciclos?|%))`, 'i'),
];

/** Monto mensual escrito por el alumno, o null. Un mensaje con JSON o con la palabra CONTEXTO no cuenta (regla 15). */
export const montoDelMensaje = (mensaje: string): number | null => {
  if (/[{}]|contexto/i.test(mensaje)) return null;
  for (const patron of MONTOS) {
    const m = mensaje.match(patron);
    if (m) {
      const monto = Number(`${m[1].replace(/,/g, '')}.${m[2] ?? '0'}`);
      if (monto > 0) return r2(monto);
    }
  }
  return null;
};

const conPresupuesto = (escenarios: AIEscenarioPeriodo[], presupuesto: number): AIEscenarioPeriodo[] =>
  escenarios.map((escenario) => ({
    ...escenario,
    diferenciaPresupuesto: escenario.cuotaMensual === null ? null : r2(presupuesto - escenario.cuotaMensual),
  }));

/**
 * Si el último mensaje del alumno trae un monto mensual, ese es su presupuesto para esa pregunta: devuelve el
 * contexto con presupuestoMensual = monto, presupuestoFuente "mensaje" y las diferencias recalculadas con las
 * mismas funciones de buildAIContext. Sin monto, con JSON o con la palabra CONTEXTO, devuelve el mismo contexto.
 */
export const aplicarMontoDelAlumno = (contexto: AIContext, mensaje: string): AIContext => {
  const monto = montoDelMensaje(mensaje);
  const { financiero, derivados } = contexto;
  if (monto === null || !financiero) return contexto;
  const escenarios = conPresupuesto(financiero.proximoPeriodo, monto);
  const cuotasPagoUnico = financiero.proximoPeriodo.find((escenario) => escenario.id === 'pago_unico')?.numeroCuotas ?? null;
  const reComparar = (pagoUnico: AIDerivados['pagoUnico']) => pagoUnico && cuotasPagoUnico !== null
    ? { ...pagoUnico, ...comparacionPagoUnico(pagoUnico.pensionAlInicio, monto, cuotasPagoUnico) } : pagoUnico;
  const conJalados = derivados.proximoPeriodoConJalados;
  return {
    ...contexto,
    financiero: { ...financiero, presupuestoMensual: monto, presupuestoFuente: 'mensaje', proximoPeriodo: escenarios },
    foco: contexto.foco?.tipo === 'ciclo' ? { ...contexto.foco, escenarios: conPresupuesto(contexto.foco.escenarios, monto) } : contexto.foco,
    derivados: {
      ...derivados,
      presupuesto: presupuestoPorEscenario(escenarios, monto),
      pagoUnico: reComparar(derivados.pagoUnico),
      proximoPeriodoConJalados: conJalados && {
        ...conJalados,
        escenarios: conJalados.escenarios.map((escenario) => ({ ...escenario, diferenciaMes: r2(monto - escenario.cuotaMensual) })),
        pagoUnico: reComparar(conJalados.pagoUnico),
      },
    },
  };
};
