// App.tsx — raíz del árbol de componentes con DndContext de @dnd-kit
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { BienvenidaModal } from '@/components/modals/BienvenidaModal';
import { TopBar } from '@/components/layout/TopBar';
import { NavBar } from '@/components/layout/NavBar';
import { PendientesPanel } from '@/components/sidebar/PendientesPanel';
import { PlannerSection } from '@/components/planner/PlannerSection';
import { CursoCard } from '@/components/planner/CursoCard';
import { PrerequisitoToast } from '@/components/common/PrerequisitoToast';
import { useMallaRestore } from '@/hooks/useMallaRestore';
import { useMallaStore } from '@/store/mallaStore';
import { validarPrerequisitos } from '@/utils/validators';
import type { Curso, UbicacionCurso } from '@/types/malla';

export default function App() {
  // Restaurar malla guardada al iniciar
  useMallaRestore();

  const { cursos, moverCurso } = useMallaStore();
  const [activeCurso, setActiveCurso] = useState<Curso | null>(null);
  const [blockedInfo, setBlockedInfo] = useState<{ cursoNombre: string; faltantes: string[] } | null>(null);

  // Configuración de sensores para mouse y touch (con tolerancia para evitar activar drag en simple click)
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
    const curso = cursos[codigoCurso];
    if (!curso) return;

    const destino = String(over.id) as UbicacionCurso;

    // Si se devuelve al pozo -> siempre permitido
    if (destino === 'pozo') {
      moverCurso(codigoCurso, 'pozo');
      return;
    }

    // Si se asigna a un ciclo (regular o verano) -> validar prerrequisitos
    const { valido, faltantes } = validarPrerequisitos(curso, cursos);
    if (!valido) {
      setBlockedInfo({
        cursoNombre: curso.nombre,
        faltantes,
      });
      return;
    }

    // Mover al destino
    moverCurso(codigoCurso, destino);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Modal de bienvenida */}
      <BienvenidaModal />

      {/* Top Bar */}
      <TopBar />

      {/* Barra de controles */}
      <NavBar />

      {/* Layout principal */}
      <main id="app-main">
        <PendientesPanel />
        <PlannerSection />
      </main>

      {/* Drag overlay flotante mientras se arrastra */}
      <DragOverlay dropAnimation={null}>
        {activeCurso ? <CursoCard curso={activeCurso} isOverlay /> : null}
      </DragOverlay>

      {/* Toast de alerta cuando un drop es bloqueado por prerrequisitos */}
      {blockedInfo && (
        <PrerequisitoToast
          cursoNombre={blockedInfo.cursoNombre}
          faltantes={blockedInfo.faltantes}
          onClose={() => setBlockedInfo(null)}
        />
      )}
    </DndContext>
  );
}
