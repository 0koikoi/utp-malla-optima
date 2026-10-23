// Hook para encapsular la lógica de Drag and Drop (Fase 6.2)
import { useState } from 'react';
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { usePlannerStore } from '@/store/plannerStore';
import type { Curso, UbicacionCurso } from '@/core/types';

export function useDragAndDrop() {
  const [activeCurso, setActiveCurso] = useState<Curso | null>(null);
  const ejecutarMovimiento = usePlannerStore((s) => s.ejecutarMovimiento);
  const setDrawerMobOpen = usePlannerStore((s) => s.setDrawerMobOpen);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requiere mover 5px para iniciar el drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const cursoData = event.active.data.current?.curso as Curso | undefined;
    if (cursoData) {
      setActiveCurso(cursoData);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCurso(null);

    if (!over) return;

    const codigoCurso = String(active.id);
    const destino = String(over.id) as UbicacionCurso;
    ejecutarMovimiento(codigoCurso, destino);

    // Cerrar el drawer de pendientes en móvil al soltar en un ciclo
    if (window.matchMedia('(max-width: 640px)').matches) {
      setDrawerMobOpen(false);
    }
  }

  return {
    activeCurso,
    sensors,
    handleDragStart,
    handleDragEnd,
  };
}
