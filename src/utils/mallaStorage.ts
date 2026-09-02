// Persistencia de malla en localStorage — slot único
// Solo se guarda la última malla cargada. Al subir una nueva, se sobreescribe.

import type { MallaSnapshot, Curso } from '@/types/malla';

const STORAGE_KEY = 'malla_data';

/** Guarda la malla parseada en localStorage (sobreescribe la anterior) */
export function saveMalla(cursos: Record<string, Curso>, nombreArchivo: string): void {
  const snapshot: MallaSnapshot = {
    version: 1,
    timestamp: new Date().toISOString(),
    nombreArchivo,
    cursos,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // localStorage lleno o bloqueado (modo privado en algunos browsers)
    console.warn('[mallaStorage] No se pudo guardar la malla:', e);
  }
}

/** Carga la malla guardada. Retorna null si no hay ninguna. */
export function loadMalla(): MallaSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as MallaSnapshot;
    // Validar versión para migraciones futuras
    if (data.version !== 1) {
      console.warn('[mallaStorage] Versión de malla desconocida, descartando.');
      clearMalla();
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[mallaStorage] Error al leer la malla:', e);
    return null;
  }
}

/** Elimina la malla guardada */
export function clearMalla(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Retorna el nombre del archivo de la última malla cargada, o null */
export function getMallaFileName(): string | null {
  const snapshot = loadMalla();
  return snapshot?.nombreArchivo ?? null;
}
