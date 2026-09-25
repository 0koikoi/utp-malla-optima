// backupService.ts — Servicio de respaldo y restauración de planes curriculares en JSON
// Permite al estudiante exportar su malla y planificación actual a un archivo .json y restaurarlo cuando lo desee.

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

import type { Curso, UbicacionCurso } from '@/types/malla';
import type { FacultadKey, DescuentoKey } from '@/data/tarifario';

export interface RespaldoMalla {
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

/**
 * Genera y descarga un archivo JSON con el estado de la planificación.
 */
export function descargarRespaldoJSON(datos: Omit<RespaldoMalla, 'version' | 'fecha'>): void {
  const respaldo: RespaldoMalla = {
    version: '1.0',
    fecha: new Date().toISOString(),
    ...datos,
  };

  const jsonContent = JSON.stringify(respaldo, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonContent);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.download = `planificacion_malla_utp_${timestamp}.json`;
  link.href = dataUri;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  }, 1000);
}

/**
 * Lee y parsea un archivo JSON de respaldo.
 */
export function leerRespaldoJSON(file: File): Promise<RespaldoMalla> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const contenido = e.target?.result as string;
        const parsed = JSON.parse(contenido);

        // Compatibilidad con formato de respaldo de dev: { cursos: Curso[] }
        if (Array.isArray(parsed?.cursos)) {
          const cursosMap: Record<string, Curso> = {};
          const asignaciones: Record<string, UbicacionCurso> = {};
          parsed.cursos.forEach((c: any) => {
            cursosMap[c.codigo] = {
              codigo: c.codigo,
              nombre: c.nombre,
              horasSemanales: c.horasSemanales ?? c.horas ?? 0,
              creditos: c.creditos ?? 0,
              tipo: (c.tipo === 'ELECTIVO' || c.tipo === 'E') ? 'ELECTIVO' as const : 'OBLIGATORIO' as const,
              estado: c.estado ?? 'PENDIENTE',
              prerequisitos: c.prerequisitos ?? c.prerrequisitos ?? [],
              habilitaA: [],
              cicloOrigen: c.cicloOrigen ?? c.ciclo ?? 1,
            };
            if (c.ubicacion === 'banco' || c.ubicacion === 'pozo') {
              asignaciones[c.codigo] = 'pozo';
            } else if (c.tipoPeriodo === 'VERANO' || String(c.ubicacion).startsWith('verano-')) {
              asignaciones[c.codigo] = String(c.ubicacion).startsWith('verano-') ? c.ubicacion : `verano-${c.ciclo}`;
            } else {
              asignaciones[c.codigo] = String(c.ubicacion).startsWith('ciclo-') ? c.ubicacion : `ciclo-${c.ciclo}`;
            }
          });
          resolve({
            version: '1.0',
            fecha: new Date().toISOString(),
            nombreArchivoCargado: 'respaldo_academico.json',
            cursos: cursosMap,
            asignaciones,
            facultad: 'ingenieria',
            descuento: 'ninguno',
            cicloInicio: 1,
            cicloFin: 10,
            veranoActivo: Object.values(asignaciones).some((u) => u.startsWith('verano-')),
            cantVeranos: 4,
            veranoUbicaciones: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 },
          });
          return;
        }

        if (!parsed.cursos || !parsed.asignaciones) {
          throw new Error('El archivo no contiene una estructura válida de respaldo de malla.');
        }
        resolve(parsed as RespaldoMalla);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Error al procesar el archivo JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Error de lectura del archivo'));
    reader.readAsText(file);
  });
}
