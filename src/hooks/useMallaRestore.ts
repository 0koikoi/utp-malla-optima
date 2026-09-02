// Hook para restaurar la malla desde localStorage al iniciar la app
// Se ejecuta una sola vez al montar App.tsx

import { useEffect } from 'react';
import { loadMalla } from '@/utils/mallaStorage';
import { useMallaStore } from '@/store/mallaStore';

export function useMallaRestore() {
  const { cursos, restaurarMalla } = useMallaStore();

  useEffect(() => {
    // Solo restaurar si el store está vacío en memoria (primera carga o recarga)
    if (Object.keys(cursos).length > 0) return;

    const snapshot = loadMalla();
    if (snapshot) {
      // Restaurar cursos preservando las asignaciones guardadas en Zustand persist
      restaurarMalla(snapshot.cursos, snapshot.nombreArchivo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar
}
