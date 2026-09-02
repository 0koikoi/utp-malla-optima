// Validadores de reglas de negocio (R1–R4)
// Funciones puras — sin efectos secundarios, fáciles de testear

import type { Curso, EstadoCurso } from '@/types/malla';
import { COSTOS_FIJOS } from '@/data/tarifario';

const ESTADOS_CUMPLIDOS: EstadoCurso[] = ['APROBADO', 'CONVALIDADO'];

/**
 * Extrae el número de ciclo de un id de ubicación.
 * - "ciclo-5"   → 5
 * - "verano-2"  → null (verano no se compara numéricamente)
 * - "pozo"      → null
 */
function cicloNumDesde(ubicacion: string): number | null {
  const match = ubicacion.match(/^ciclo-(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

/**
 * R1 — Verifica si todos los prerrequisitos de un curso están cumplidos.
 *
 * Un prerrequisito se considera CUMPLIDO si:
 *   a) Tiene estado APROBADO o CONVALIDADO, O
 *   b) Está asignado a un ciclo regular con número MENOR al ciclo destino
 *      (el usuario lo planificó antes — "lo llevará antes").
 *
 * Si el destino es un ciclo de verano, solo se acepta APROBADO/CONVALIDADO,
 * ya que el verano es un período especial fuera de la secuencia regular.
 *
 * @param curso       Curso que se intenta asignar
 * @param diccionario Todos los cursos de la malla
 * @param asignaciones Mapa código → ubicación actual de cada curso
 * @param destinoId   ID del droppable destino (ej: "ciclo-5", "verano-2")
 */
export function validarPrerequisitos(
  curso: Curso,
  diccionario: Record<string, Curso>,
  asignaciones: Record<string, string>,
  destinoId: string
): { valido: boolean; faltantes: { codigo: string; nombre: string }[] } {
  if (curso.prerequisitos.length === 0) return { valido: true, faltantes: [] };

  const destCicloNum = cicloNumDesde(destinoId);
  const faltantes: { codigo: string; nombre: string }[] = [];

  for (const codigoPre of curso.prerequisitos) {
    const pre = diccionario[codigoPre];
    if (!pre) continue; // no existe en la malla (nivelación, etc.)

    // a) Ya aprobado o convalidado → cumplido
    if (ESTADOS_CUMPLIDOS.includes(pre.estado)) continue;

    // b) Planificado en un ciclo anterior al destino (solo para destinos regulares)
    if (destCicloNum !== null) {
      const preCicloNum = cicloNumDesde(asignaciones[pre.codigo] ?? '');
      if (preCicloNum !== null && preCicloNum < destCicloNum) continue;
    }

    // No cumplido — registrar con código y nombre para identificación completa
    faltantes.push({ codigo: pre.codigo, nombre: pre.nombre || codigoPre });
  }

  return { valido: faltantes.length === 0, faltantes };
}

/** R2 — Verifica si las horas superan el límite recomendado */
export function validarLimiteHoras(horas: number, esVerano: boolean): boolean {
  const horasTar = esVerano ? horas * 2 : horas;
  return horasTar > 22;
}

/** R3 — Verifica si se cumple el mínimo de créditos electivos */
export function validarMinimoElectivos(creditosElectivosActuales: number): boolean {
  return creditosElectivosActuales >= COSTOS_FIJOS.limiteElectivosMinimo;
}

/** R4 — Verifica si los créditos de un verano superan el límite */
export function validarLimiteCreditosVerano(creditos: number): boolean {
  return creditos > COSTOS_FIJOS.limiteCreditosVerano;
}
