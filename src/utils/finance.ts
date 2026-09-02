// Motor financiero — funciones puras (sin efectos secundarios)
// Fáciles de testear con Vitest
// Migrado de app-script.js → recalcularFinanzas()

import {
  ESTRUCTURA_TARIFARIA,
  DESCUENTOS,
  COSTOS_FIJOS,
  type FacultadKey,
  type DescuentoKey,
} from '@/data/tarifario';
import type { FinanzasCiclo, Curso, EstadoCurso } from '@/types/malla';

/** Calcula el costo de pensión para un conjunto de horas semanales */
export function calcularCostoBase(horasTar: number, facultad: FacultadKey): number {
  if (horasTar <= 0) return 0;
  const reglas = ESTRUCTURA_TARIFARIA[facultad];

  for (const rango of reglas.rangos) {
    if (horasTar >= rango.min && horasTar <= rango.max) return rango.precio;
  }
  if (horasTar > reglas.limiteHoras) {
    return reglas.precioBase + (horasTar - reglas.limiteHoras) * reglas.horaExtra;
  }
  return 0;
}

/** Calcula las finanzas de un ciclo dado un array de cursos pendientes en él */
export function calcularFinanzasCiclo(
  cicloId: string,
  cursosPendientes: Curso[],
  facultad: FacultadKey,
  descuento: DescuentoKey,
  esVerano: boolean
): FinanzasCiclo {
  const factorDesc = 1 - DESCUENTOS[descuento];

  let horasBrutas = 0;
  let credBrutos = 0;

  for (const c of cursosPendientes) {
    horasBrutas += c.horas;
    credBrutos += c.creditos;
  }

  // Redondeo seguro contra floating point
  const horas = Math.round(horasBrutas * 100) / 100;
  const creditos = Math.round(credBrutos * 100) / 100;

  // En verano: horas × 2 para ubicar el tramo tarifario
  const horasTar = esVerano ? horas * 2 : horas;
  const costoBase = calcularCostoBase(horasTar, facultad);
  const costoFinal = costoBase * factorDesc;

  const reglas = ESTRUCTURA_TARIFARIA[facultad];
  const excesoHoras = horasTar > reglas.limiteHoras;
  const excesoCreditosVerano = esVerano && creditos > COSTOS_FIJOS.limiteCreditosVerano;

  return {
    cicloId,
    horas,
    creditos,
    costoFinal,
    matricula: esVerano ? COSTOS_FIJOS.matriculaVerano : COSTOS_FIJOS.matriculaRegular,
    excesoHoras,
    excesoCreditosVerano,
  };
}

/** Total de créditos electivos cursados/planificados (para la regla R3) */
export function calcularCreditosElectivos(
  cursos: Record<string, Curso>,
  asignaciones: Record<string, string>
): number {
  const estadosValidos: EstadoCurso[] = ['APROBADO', 'CONVALIDADO'];

  return Object.values(cursos)
    .filter((c) => {
      if (c.tipo !== 'E') return false;
      // Cuenta si está aprobado/convalidado O si está asignado a un ciclo (planificado)
      const aprobado = estadosValidos.includes(c.estado);
      const planificado = asignaciones[c.codigo] && asignaciones[c.codigo] !== 'pozo';
      return aprobado || planificado;
    })
    .reduce((sum, c) => sum + c.creditos, 0);
}

/** Formatea un número como moneda peruana */
export function formatSoles(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}
