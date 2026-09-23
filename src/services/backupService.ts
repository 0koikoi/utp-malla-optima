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
        const parsed = JSON.parse(contenido) as RespaldoMalla;
        if (!parsed.cursos || !parsed.asignaciones) {
          throw new Error('El archivo no contiene una estructura válida de respaldo de malla.');
        }
        resolve(parsed);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Error al procesar el archivo JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Error de lectura del archivo'));
    reader.readAsText(file);
  });
}
