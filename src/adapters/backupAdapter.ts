/**
 * backupAdapter.ts — Adaptador canónico de serialización y persistencia de respaldos (Fase 3)
 *
 * Consolida `services/backupService.ts` y `infrastructure/persistence/backupService.ts`.
 * Permite serializar y deserializar el estado del planificador curricular en formato JSON,
 * con soporte para versionado de esquemas y migración de formatos legacy.
 */

import type { Curso, UbicacionCurso } from '@/core/types';
import type { FacultadKey, DescuentoKey } from '@/data/tarifario';
import type { PlannerState } from '@/store/plannerStore';

export interface RespaldoJSON {
  version: string;
  fecha: string;
  nombreArchivoCargado: string | null;
  facultad: FacultadKey;
  descuento: DescuentoKey;
  cicloInicio: number;
  cicloFin: number;
  veranoActivo: boolean;
  cantVeranos: number;
  periodoIngreso?: 'marzo' | 'agosto';
  veranoUbicaciones: Record<number, number>;
  cursos: Record<string, Curso>;
  asignaciones: Record<string, UbicacionCurso>;
}

// Alias de retrocompatibilidad
export type RespaldoMalla = RespaldoJSON;

/**
 * Descarga un Blob directamente en el navegador del usuario.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Serializa el estado de `PlannerState` a un objeto `RespaldoJSON` estandarizado.
 */
export function serializar(state: PlannerState | Omit<RespaldoJSON, 'version' | 'fecha'>): RespaldoJSON {
  return {
    version: '2.0',
    fecha: new Date().toISOString(),
    nombreArchivoCargado: state.nombreArchivoCargado,
    facultad: state.facultad,
    descuento: state.descuento,
    cicloInicio: state.cicloInicio,
    cicloFin: state.cicloFin,
    veranoActivo: state.veranoActivo,
    cantVeranos: state.cantVeranos,
    periodoIngreso: state.periodoIngreso ?? 'marzo',
    veranoUbicaciones: state.veranoUbicaciones || (state.periodoIngreso === 'agosto'
      ? { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 }
      : { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }),
    cursos: state.cursos,
    asignaciones: state.asignaciones,
  };
}

/**
 * Deserializa y valida cualquier estructura de respaldo JSON, adaptando esquemas previos.
 */
export function deserializar(json: unknown): RespaldoJSON {
  if (!json || typeof json !== 'object') {
    throw new Error('El archivo no contiene un objeto JSON válido.');
  }

  const parsed = json as Record<string, any>;

  // Formato legacy dev: { version: 1, cursos: Curso[] }
  if (Array.isArray(parsed.cursos)) {
    const cursosMap: Record<string, Curso> = {};
    const asignaciones: Record<string, UbicacionCurso> = {};

    parsed.cursos.forEach((c: any) => {
      const codigo = String(c.codigo ?? '');
      if (!codigo) return;

      const horasSemanales =
        typeof c.horasSemanales === 'number'
          ? c.horasSemanales
          : typeof c.horas === 'number'
            ? c.horas
            : (Number(c.horasTeoria ?? 0) + Number(c.horasPractica ?? 0)) || 0;

      cursosMap[codigo] = {
        codigo,
        nombre: String(c.nombre ?? codigo),
        horasSemanales,
        creditos: Number(c.creditos ?? 0) || 0,
        tipo: (c.tipo === 'ELECTIVO' || c.tipo === 'E') ? 'ELECTIVO' : 'OBLIGATORIO',
        estado: c.estado ?? 'PENDIENTE',
        prerequisitos: c.prerequisitos ?? c.prerrequisitos ?? [],
        habilitaA: c.habilitaA ?? [],
        cicloOrigen: Number(c.cicloOrigen ?? c.ciclo ?? 1),
        esLaboratorio: Boolean(c.esLaboratorio),
      };

      if (c.ubicacion === 'banco' || c.ubicacion === 'pozo') {
        asignaciones[codigo] = 'pozo';
      } else if (c.tipoPeriodo === 'VERANO' || String(c.ubicacion).startsWith('verano-')) {
        asignaciones[codigo] = String(c.ubicacion).startsWith('verano-')
          ? c.ubicacion
          : (`verano-${c.ciclo ?? 1}` as UbicacionCurso);
      } else {
        asignaciones[codigo] = String(c.ubicacion).startsWith('ciclo-')
          ? c.ubicacion
          : (`ciclo-${c.ciclo ?? 1}` as UbicacionCurso);
      }
    });

    return {
      version: '1.0',
      fecha: parsed.fecha ?? new Date().toISOString(),
      nombreArchivoCargado: 'respaldo_academico.json',
      cursos: cursosMap,
      asignaciones,
      facultad: 'ingenieria',
      descuento: 'ninguno',
      cicloInicio: 1,
      cicloFin: Math.max(12, ...Object.values(cursosMap).map((c) => c.cicloOrigen)),
      veranoActivo: Object.values(asignaciones).some((u) => u.startsWith('verano-')),
      cantVeranos: 3,
      periodoIngreso: 'marzo',
      veranoUbicaciones: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 },
    };
  }

  // Formato canónico v1.0 o v2.0
  if (!parsed.cursos || typeof parsed.cursos !== 'object' || !parsed.asignaciones || typeof parsed.asignaciones !== 'object') {
    throw new Error('El archivo no contiene una estructura válida de respaldo de malla.');
  }

  // Normalizar cursos dentro del diccionario
  const cursosNormalizados: Record<string, Curso> = {};
  for (const [cod, c] of Object.entries(parsed.cursos as Record<string, any>)) {
    const horasSemanales =
      typeof c.horasSemanales === 'number' && !Number.isNaN(c.horasSemanales)
        ? c.horasSemanales
        : (Number(c.horasTeoria ?? 0) + Number(c.horasPractica ?? 0)) || 0;

    cursosNormalizados[cod] = {
      codigo: c.codigo ?? cod,
      nombre: c.nombre ?? cod,
      horasSemanales,
      creditos: Number(c.creditos ?? 0) || 0,
      tipo: (c.tipo === 'ELECTIVO' || c.tipo === 'E') ? 'ELECTIVO' : 'OBLIGATORIO',
      estado: c.estado ?? 'PENDIENTE',
      prerequisitos: c.prerequisitos ?? c.prerrequisitos ?? [],
      habilitaA: c.habilitaA ?? [],
      cicloOrigen: Number(c.cicloOrigen ?? c.ciclo ?? 1),
      esLaboratorio: Boolean(c.esLaboratorio),
    };
  }

  return {
    version: parsed.version ?? '2.0',
    fecha: parsed.fecha ?? new Date().toISOString(),
    nombreArchivoCargado: parsed.nombreArchivoCargado ?? null,
    facultad: parsed.facultad ?? 'ingenieria',
    descuento: parsed.descuento ?? 'scotiabank',
    cicloInicio: parsed.cicloInicio ?? 1,
    cicloFin: parsed.cicloFin ?? 12,
    veranoActivo: Boolean(parsed.veranoActivo),
    cantVeranos: parsed.cantVeranos ?? 3,
    periodoIngreso: parsed.periodoIngreso ?? 'marzo',
    veranoUbicaciones: parsed.veranoUbicaciones ?? (parsed.periodoIngreso === 'agosto'
      ? { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 }
      : { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 }),
    cursos: cursosNormalizados,
    asignaciones: parsed.asignaciones,
  };
}

/**
 * Genera y descarga un archivo JSON con el estado de la planificación.
 */
export function descargarRespaldoJSON(datos: Omit<RespaldoJSON, 'version' | 'fecha'> | PlannerState): void {
  const respaldo = serializar(datos);
  const jsonContent = JSON.stringify(respaldo, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `planificacion_malla_utp_${timestamp}.json`);
}

/**
 * Lee un archivo JSON seleccionado por el usuario y retorna el `RespaldoJSON` deserializado.
 */
export async function leerRespaldoJSON(file: File): Promise<RespaldoJSON> {
  const contenido = await file.text();
  const parsed = JSON.parse(contenido);
  return deserializar(parsed);
}

// ─── Compatibilidad para el legacy infrastructure/persistence/backupService ──

export function exportCoursesBackup(cursos: Curso[]): Blob {
  const data = JSON.stringify({ version: 1, cursos }, null, 2);
  return new Blob([data], { type: 'application/json' });
}

export async function importCoursesBackup(file: File): Promise<Curso[]> {
  const respaldo = await leerRespaldoJSON(file);
  return Object.values(respaldo.cursos);
}
