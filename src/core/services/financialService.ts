/**
 * financialService.ts — Motor financiero unificado del dominio (Fase 4)
 *
 * Consolida `financial/FinancialEngine.ts` con `data/tarifario.ts` y `utils/finance.ts`.
 * Proporciona el cálculo canónico de costos académicos, pensiones, cuotas por ciclo,
 * métodos de pronto pago, matrícula regular/verano y validaciones de límites de carga horaria.
 */

import type {
  Curso,
  Tarifario,
  FinanzasCiclo,
  ResumenFinanciero,
  TipoPeriodo,
} from '@/core/types';
import {
  ESTRUCTURA_TARIFARIA,
  DESCUENTOS,
  COSTOS_FIJOS,
  type FacultadKey,
  type DescuentoKey,
} from '@/data/tarifario';
import defaultCostosJSON from '@/data/universidades/pe-utp/costos.json';

// ─── Tipos del Servicio Financiero ───────────────────────────────────────────

export interface ConfigFinanciera {
  facultad?: FacultadKey | string;
  disciplina?: string;
  descuento?: DescuentoKey | string;
  metodoPago?: string;
  pagoUnico?: boolean;
  esVerano?: boolean;
  tipoPeriodo?: TipoPeriodo;
  cicloId?: string;
  tarifario?: Tarifario;
}

export type ResultadoFinancieroCiclo = ResumenFinanciero & FinanzasCiclo;

// ─── Mapeos canónicos entre nomenclaturas ─────────────────────────────────────

export const MAPA_FACULTAD_A_DISCIPLINA: Record<string, string> = {
  ingenieria: 'Ingeniería y Arquitectura',
  salud_gestion: 'Gestión, Humanidades y Ciencias de la Salud',
  gestion: 'Gestión, Humanidades y Ciencias de la Salud',
  farmacia: 'Ingeniería y Arquitectura',
};

export const MAPA_DESCUENTO_A_METODO_PAGO: Record<string, string> = {
  ninguno: 'sin_descuento',
  bcp: 'bcp_bbva',
  scotiabank: 'interbank_scotiabank',
};

const redondear = (valor: number): number =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

// ─── Adaptación de EstructuraFacultad a Tarifario ─────────────────────────────

/**
 * Convierte una facultad de `data/tarifario.ts` en un objeto de tipo `Tarifario` canónico,
 * fusionándolo con el tarifario base de UTP.
 */
export function adaptarFacultadATarifario(
  facultadKey: FacultadKey | string,
  tarifarioBase: Tarifario = defaultCostosJSON as unknown as Tarifario
): { tarifario: Tarifario; disciplina: string } {
  const key = (facultadKey as FacultadKey) in ESTRUCTURA_TARIFARIA
    ? (facultadKey as FacultadKey)
    : 'ingenieria';

  const disciplina = MAPA_FACULTAD_A_DISCIPLINA[key] ?? 'Ingeniería y Arquitectura';

  // Si el tarifario base ya cuenta con la disciplina configurada, se reutiliza
  if (tarifarioBase.disciplinas[disciplina]) {
    return { tarifario: tarifarioBase, disciplina };
  }

  // De lo contrario, se genera la disciplina en base a ESTRUCTURA_TARIFARIA
  const datosFacultad = ESTRUCTURA_TARIFARIA[key];
  const nuevoTarifario: Tarifario = {
    ...tarifarioBase,
    disciplinas: {
      ...tarifarioBase.disciplinas,
      [disciplina]: {
        costoMatriculaRegular: COSTOS_FIJOS.matriculaRegular,
        costoPorCredito: 0,
        costoPorHora: 0,
        costoPorCurso: 0,
        costoFijoLaboratorio: 0,
        recargoRepitenciaPorcentaje: 0,
        costoHoraAdicional: datosFacultad.horaExtra,
        rangosPension: datosFacultad.rangos.map((r) => ({
          minHoras: r.min,
          maxHoras: r.max,
          montoCuota: r.precio,
        })),
      },
    },
  };

  return { tarifario: nuevoTarifario, disciplina };
}

// ─── Funciones Canónicas de Cálculo ──────────────────────────────────────────

/**
 * Calcula la cuota base de pensión para un número de horas semanales según la facultad.
 */
export function calcularCostoBase(horasTar: number, facultad: FacultadKey | string = 'ingenieria'): number {
  if (horasTar <= 0 || Number.isNaN(horasTar)) return 0;
  const key = (facultad in ESTRUCTURA_TARIFARIA ? facultad : 'ingenieria') as FacultadKey;
  const reglas = ESTRUCTURA_TARIFARIA[key];

  for (const rango of reglas.rangos) {
    if (horasTar >= rango.min && horasTar <= rango.max) return rango.precio;
  }
  if (horasTar > reglas.limiteHoras) {
    return reglas.precioBase + (horasTar - reglas.limiteHoras) * reglas.horaExtra;
  }
  return 0;
}

/**
 * Función principal unificada de cálculo financiero por ciclo/periodo.
 * Emite una estructura híbrida que satisface tanto a `ResumenFinanciero` (motor de dev)
 * como a `FinanzasCiclo` (planificador visual).
 */
export function calcularFinanzasCiclo(
  cursos: Curso[],
  config: ConfigFinanciera | FacultadKey = {}
): ResultadoFinancieroCiclo {
  // Manejo de sobrecarga retrocompatible con la firma anterior (cursos, facultad)
  const cfg: ConfigFinanciera = typeof config === 'string'
    ? { facultad: config }
    : config;

  const esVerano = Boolean(cfg.esVerano || cfg.tipoPeriodo === 'VERANO');
  const tipoPeriodo: TipoPeriodo = esVerano ? 'VERANO' : 'REGULAR';
  const facultadKey = (cfg.facultad as FacultadKey) ?? 'ingenieria';

  const { tarifario, disciplina } = adaptarFacultadATarifario(
    facultadKey,
    cfg.tarifario ?? (defaultCostosJSON as unknown as Tarifario)
  );

  const disciplinaActiva = cfg.disciplina ?? disciplina;
  const tarifasFallback = {
    costoMatriculaRegular: COSTOS_FIJOS.matriculaRegular,
    costoHoraAdicional: 38,
    rangosPension: [],
  };
  const tarifas = tarifario.disciplinas[disciplinaActiva] ?? Object.values(tarifario.disciplinas)[0] ?? tarifasFallback;

  // Acumulación defensiva de horas y créditos
  let horasSemanalesBrutas = 0;
  let creditosBrutos = 0;

  for (const c of cursos) {
    const h = typeof c.horasSemanales === 'number' && !Number.isNaN(c.horasSemanales)
      ? c.horasSemanales
      : (Number((c as any).horasTeoria ?? 0) + Number((c as any).horasPractica ?? 0)) || 0;
    const cr = typeof c.creditos === 'number' && !Number.isNaN(c.creditos) ? c.creditos : 0;
    horasSemanalesBrutas += h;
    creditosBrutos += cr;
  }

  const totalHorasSemanales = redondear(horasSemanalesBrutas);
  const totalCreditos = redondear(creditosBrutos);

  // En periodo de verano la carga horaria semanal se duplica para ubicar el tramo arancelario
  const horasTarifarias = esVerano ? totalHorasSemanales * 2 : totalHorasSemanales;

  // Cálculo de cuota base según rangos de pensión
  let cuotaBaseCalculada = 0;
  let horasExceso = 0;
  let costoHorasExcesoPorCuota = 0;

  if (horasTarifarias > 0) {
    const rangos = tarifas.rangosPension ?? [];
    const rangoEncontrado = rangos.find((r) => horasTarifarias >= r.minHoras && horasTarifarias <= r.maxHoras);

    if (rangoEncontrado) {
      cuotaBaseCalculada = rangoEncontrado.montoCuota;
    } else {
      const ultimoRango = [...rangos].sort((a, b) => b.maxHoras - a.maxHoras)[0];
      if (ultimoRango) {
        horasExceso = Math.max(0, horasTarifarias - ultimoRango.maxHoras);
        costoHorasExcesoPorCuota = redondear(horasExceso * (tarifas.costoHoraAdicional ?? 0));
        cuotaBaseCalculada = redondear(ultimoRango.montoCuota + costoHorasExcesoPorCuota);
      }
    }
  }

  const cuotaBase = redondear(cuotaBaseCalculada);

  // Determinación del método de pago y descuento aplicable
  const claveMetodoPago = cfg.metodoPago ?? (cfg.descuento ? MAPA_DESCUENTO_A_METODO_PAGO[cfg.descuento] : 'sin_descuento');
  const metodoPago = !esVerano && claveMetodoPago ? tarifario.metodosPago?.[claveMetodoPago] : undefined;

  let factorDescuento = 0;
  if (!esVerano) {
    if (cfg.descuento && (cfg.descuento as DescuentoKey) in DESCUENTOS) {
      factorDescuento = DESCUENTOS[cfg.descuento as DescuentoKey];
    } else if (metodoPago?.descuentoPorcentaje) {
      factorDescuento = metodoPago.descuentoPorcentaje / 100;
    }
  }

  const usaPagoUnico = !esVerano && cfg.pagoUnico === true;
  const descuentoPagoUnicoPorcentaje = usaPagoUnico ? (tarifario.descuentoPagoUnicoRegular ?? 7.5) : 0;
  const descuentoPorcentaje = usaPagoUnico ? descuentoPagoUnicoPorcentaje : redondear(factorDescuento * 100);

  const numeroCuotas = esVerano
    ? Math.max(1, tarifario.cuotasPorVerano ?? 2)
    : Math.max(1, tarifario.cuotasPorCiclo ?? 5);

  const totalCuotasAntesDescuento = redondear(cuotaBase * numeroCuotas);
  const descuentoMontoPorCuota = redondear(cuotaBase * (descuentoPorcentaje / 100));
  const montoPorCuota = usaPagoUnico
    ? cuotaBase
    : redondear(cuotaBase - descuentoMontoPorCuota);

  const descuentoPagoUnicoMonto = usaPagoUnico
    ? redondear(totalCuotasAntesDescuento * (descuentoPagoUnicoPorcentaje / 100))
    : 0;

  const costoMatricula = esVerano
    ? Math.max(0, tarifario.costoMatriculaVerano ?? COSTOS_FIJOS.matriculaVerano)
    : tarifas.costoMatriculaRegular;

  const costoEnsenanzaTotal = redondear(
    usaPagoUnico
      ? totalCuotasAntesDescuento - descuentoPagoUnicoMonto
      : montoPorCuota * numeroCuotas
  );

  const costoTotalCiclo = redondear(costoMatricula + costoEnsenanzaTotal);

  // Costo representativo para la tarjeta del ciclo visual (pensión mensual con descuento)
  const costoFinal = Number.isNaN(montoPorCuota) ? 0 : montoPorCuota;

  const reglasFacultad = ESTRUCTURA_TARIFARIA[facultadKey];
  const excesoHorasLimite = horasTarifarias > (reglasFacultad?.limiteHoras ?? 26);
  const excesoCreditosVerano = esVerano && totalCreditos > COSTOS_FIJOS.limiteCreditosVerano;

  return {
    // ── ResumenFinanciero ──
    totalCreditos,
    totalHorasSemanales,
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
    horasExceso,
    costoHorasExcesoPorCuota,
    pagoUnico: usaPagoUnico,
    descuentoPagoUnicoMonto,

    // ── FinanzasCiclo ──
    cicloId: cfg.cicloId ?? (esVerano ? 'verano-1' : 'ciclo-1'),
    horasSemanales: totalHorasSemanales,
    creditos: totalCreditos,
    costoFinal,
    matricula: costoMatricula,
    excesoHoras: excesoHorasLimite,
    excesoCreditosVerano,
  };
}

/**
 * Total de créditos electivos cursados o planificados (para la regla R3).
 */
export function calcularCreditosElectivos(
  cursos: Record<string, Curso> | Curso[],
  asignaciones: Record<string, string>
): number {
  const estadosValidos = ['APROBADO', 'CONVALIDADO'];
  const listaCursos = Array.isArray(cursos) ? cursos : Object.values(cursos);

  return listaCursos
    .filter((c) => {
      if (c.tipo !== 'ELECTIVO') return false;
      const aprobado = estadosValidos.includes(c.estado);
      const planificado = asignaciones[c.codigo] && asignaciones[c.codigo] !== 'pozo';
      return aprobado || planificado;
    })
    .reduce((sum, c) => sum + (Number(c.creditos) || 0), 0);
}

/**
 * Formatea un valor numérico como moneda en Soles (PEN).
 */
export function formatSoles(amount: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'S/ 0.00';
  return `S/ ${amount.toFixed(2)}`;
}
