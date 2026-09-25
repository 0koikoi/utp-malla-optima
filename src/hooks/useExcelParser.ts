// Hook para parsear el archivo .xlsx de la malla UTP
// Fase 3: Delega el procesamiento al adaptador canónico `utpExcelAdapter` y despacha al `plannerStore`.

import { useCallback, useState } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { parseUTPExcelToMap } from '@/adapters/utpExcelAdapter';

export function useExcelParser() {
  const setCursos = usePlannerStore((s) => s.setCursos);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsearExcel = useCallback(
    async (file: File) => {
      setCargando(true);
      setError(null);
      try {
        const cursosMap = await parseUTPExcelToMap(file);
        if (Object.keys(cursosMap).length === 0) {
          throw new Error('No se encontraron cursos válidos en el archivo Excel.');
        }

        // Actualizar el store unificado (reinicia asignaciones con el nuevo archivo)
        setCursos(cursosMap, file.name);
        return true;
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error al procesar el archivo Excel';
        setError(mensaje);
        console.error('Error al procesar el Excel de la malla:', err);
        return false;
      } finally {
        setCargando(false);
      }
    },
    [setCursos]
  );

  return { parsearExcel, cargando, error };
}
