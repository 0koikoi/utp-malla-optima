// Validadores de reglas de negocio (R1–R4)
// Funciones puras — sin efectos secundarios, fáciles de testear

import type { Curso, EstadoCurso } from '@/types/malla';
import { COSTOS_FIJOS } from '@/data/tarifario';

const ESTADOS_CUMPLIDOS: EstadoCurso[] = ['APROBADO', 'CONVALIDADO'];

/** R1 — Verifica si todos los prerrequisitos de un curso están cumplidos.
 *  Un prerrequisito se considera cumplido si tiene estado APROBADO o CONVALIDADO,
 *  O si está asignado a un ciclo ANTERIOR al ciclo destino en el planificador.
 *
 *  En Fase 2 se agregará la validación de ciclo anterior.
 *  Por ahora (Fase 0): solo valida estado APROBADO/CONVALIDADO.
 */
export function validarPrerequisitos(
  curso: Curso,
  diccionario: Record<string, Curso>
): { valido: boolean; faltantes: string[] } {
  if (curso.prerequisitos.length === 0) return { valido: true, faltantes: [] };

  const faltantes: string[] = [];

  for (const codigoPre of curso.prerequisitos) {
    const pre = diccionario[codigoPre];
    if (!pre) continue; // prerrequisito no encontrado en la malla (nivelación, etc.)
    if (!ESTADOS_CUMPLIDOS.includes(pre.estado)) {
      faltantes.push(pre.nombre || codigoPre);
    }
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
