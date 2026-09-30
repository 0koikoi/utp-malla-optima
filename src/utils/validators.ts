// Validadores de reglas de negocio (R1–R4)
// Funciones puras — sin efectos secundarios, fáciles de testear

import type { Curso, EstadoCurso } from '@/types/malla';
import { COSTOS_FIJOS } from '@/data/tarifario';

const ESTADOS_CUMPLIDOS: EstadoCurso[] = ['APROBADO', 'CONVALIDADO'];

/**
 * Determina la posición cronológica continua de una ubicación:
 * - "ciclo-1"   → 1.0
 * - "ciclo-2"   → 2.0
 * - "verano-1"  → (trasCiclo) + 0.5 (ej. tras ciclo 2 → 2.5)
 * - "pozo"      → null
 */
export function ordenCronologico(
  ubicacion: string,
  veranoUbicaciones: Record<number, number> = { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }
): number | null {
  const matchCiclo = ubicacion.match(/^ciclo-(\d+)$/);
  if (matchCiclo && matchCiclo[1] !== undefined) return parseInt(matchCiclo[1], 10);

  const matchVerano = ubicacion.match(/^verano-(\d+)$/);
  if (matchVerano && matchVerano[1] !== undefined) {
    const vNum = parseInt(matchVerano[1], 10);
    const trasCiclo = veranoUbicaciones[vNum] ?? (vNum * 2);
    return trasCiclo + 0.5;
  }

  return null;
}

/**
 * R1 — Verifica si todos los prerrequisitos de un curso están cumplidos.
 *
 * Un prerrequisito se considera CUMPLIDO si:
 *   a) Tiene estado APROBADO o CONVALIDADO, O
 *   b) Está asignado a un período cronológicamente ANTERIOR al período destino
 *      (sea ciclo regular o ciclo de verano relativo).
 *
 * @param curso             Curso que se intenta asignar
 * @param diccionario       Todos los cursos de la malla
 * @param asignaciones      Mapa código → ubicación actual de cada curso
 * @param destinoId         ID del droppable destino (ej: "ciclo-5", "verano-2")
 * @param veranoUbicaciones Configuración de a qué ciclo sigue cada verano
 */
export function validarPrerequisitos(
  curso: Curso,
  diccionario: Record<string, Curso>,
  asignaciones: Record<string, string>,
  destinoId: string,
  veranoUbicaciones?: Record<number, number>
): { valido: boolean; faltantes: { codigo: string; nombre: string }[] } {
  if (curso.prerequisitos.length === 0) return { valido: true, faltantes: [] };

  const destOrden = ordenCronologico(destinoId, veranoUbicaciones);
  const faltantes: { codigo: string; nombre: string }[] = [];

  for (const codigoPre of curso.prerequisitos) {
    const pre = diccionario[codigoPre];
    if (!pre) continue; // no existe en la malla (nivelación, etc.)

    // a) Ya aprobado o convalidado → cumplido
    if (ESTADOS_CUMPLIDOS.includes(pre.estado)) continue;

    // b) Planificado o En Curso en un período anterior al destino
    if (destOrden !== null) {
      const preUbi =
        asignaciones[pre.codigo] ??
        (pre.estado === 'EN_CURSO' || pre.estado === 'EN CURSO'
          ? `ciclo-${pre.cicloOrigen}`
          : '');
      const preOrden = ordenCronologico(preUbi, veranoUbicaciones);
      if (preOrden !== null && preOrden < destOrden) continue;
    }

    // No cumplido — registrar con código y nombre para identificación completa
    faltantes.push({ codigo: pre.codigo, nombre: pre.nombre || codigoPre });
  }

  return { valido: faltantes.length === 0, faltantes };
}

/**
 * Verifica si mover un curso romperá los prerrequisitos de otros cursos
 * que ya habían sido asignados a ciclos posteriores en la malla.
 */
export function verificarRupturasEnCascada(
  codigoCursoMovido: string,
  nuevoDestino: string,
  diccionario: Record<string, Curso>,
  asignaciones: Record<string, string>,
  veranoUbicaciones?: Record<number, number>
): { codigo: string; nombre: string; ubicacion: string }[] {
  const cursoMovido = diccionario[codigoCursoMovido];
  if (!cursoMovido) return [];

  // Asignaciones simuladas después del movimiento
  const asignacionesSimuladas: Record<string, string> = {
    ...asignaciones,
    [codigoCursoMovido]: nuevoDestino,
  };

  const rotos: { codigo: string; nombre: string; ubicacion: string }[] = [];

  // Evaluar solo cursos asignados a ciclos o veranos (excluyendo el pozo y aprobados)
  for (const [codigo, ubi] of Object.entries(asignacionesSimuladas)) {
    if (codigo === codigoCursoMovido) continue;
    if (ubi === 'pozo') continue;

    const curso = diccionario[codigo];
    if (!curso) continue;
    if (ESTADOS_CUMPLIDOS.includes(curso.estado)) continue;

    // Si este curso requiere el curso que estamos moviendo
    if (curso.prerequisitos.includes(codigoCursoMovido)) {
      const check = validarPrerequisitos(curso, diccionario, asignacionesSimuladas, ubi, veranoUbicaciones);
      if (!check.valido) {
        rotos.push({ codigo: curso.codigo, nombre: curso.nombre, ubicacion: ubi });
      }
    }
  }

  return rotos;
}

/**
 * Retorna todos los cursos asignados que actualmente tienen sus prerrequisitos rotos.
 * Útil para mantener sincronizado el estado global visual.
 */
export function obtenerTodosCursosRotos(
  diccionario: Record<string, Curso>,
  asignaciones: Record<string, string>,
  veranoUbicaciones?: Record<number, number>
): string[] {
  const rotos: string[] = [];
  for (const [codigo, ubi] of Object.entries(asignaciones)) {
    if (ubi === 'pozo') continue;
    const curso = diccionario[codigo];
    if (
      !curso ||
      ESTADOS_CUMPLIDOS.includes(curso.estado) ||
      curso.estado === 'EN_CURSO' ||
      curso.estado === 'EN CURSO'
    )
      continue;
    
    const check = validarPrerequisitos(curso, diccionario, asignaciones, ubi, veranoUbicaciones);
    if (!check.valido) {
      rotos.push(codigo);
    }
  }
  return rotos;
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
