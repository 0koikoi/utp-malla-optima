import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Homepage } from '@/components/home/Homepage';
import { BienvenidaModal } from '@/components/modals/BienvenidaModal';
import { TopBar } from '@/components/layout/TopBar';
import { NavBar } from '@/components/layout/NavBar';
import { ConfigSidebar } from '@/components/layout/ConfigSidebar';
import { MobileMenuModal } from '@/components/layout/MobileMenuModal';
import { PendientesPanel } from '@/components/sidebar/PendientesPanel';
import { PlannerSection } from '@/components/planner/PlannerSection';
import { CursoCard } from '@/components/planner/CursoCard';
import { ToastContainer } from '@/components/common/ToastContainer';
import { FinancialDrawer } from '@/financial/components/FinancialDrawer';
import { usePlannerStore } from '@/store/plannerStore';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

import { Pointer, X } from 'lucide-react';

export default function App() {
  const {
    cursos,
    nombreArchivoCargado,
    cursoAMover,
    setCursoAMover,
  } = usePlannerStore();

  const { activeCurso, sensors, handleDragStart, handleDragEnd } = useDragAndDrop();

  const hayMallaCargada = !!nombreArchivoCargado && Object.keys(cursos).length > 0;

  // Si no hay malla cargada, mostrar la Homepage de inicio con subida directa
  if (!hayMallaCargada) {
    return <Homepage />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Modal de bienvenida */}
      <BienvenidaModal />

      {/* Menú responsive lateral para móviles */}
      <MobileMenuModal />

      {/* Top Bar */}
      <TopBar />

      {/* Barra de controles */}
      <NavBar />

      {/* Config Sidebar */}
      <ConfigSidebar />

      {/* Layout principal */}
      <main id="app-main">
        <PendientesPanel />
        <PlannerSection />
      </main>

      {/* Drag overlay flotante mientras se arrastra */}
      <DragOverlay dropAnimation={null}>
        {activeCurso ? <CursoCard curso={activeCurso} isOverlay /> : null}
      </DragOverlay>

      {/* Sistema centralizado de notificaciones Toast */}
      <ToastContainer />

      {/* Barra flotante inferior en modo selección Two-Tap (móvil) */}
      {cursoAMover && (
        <div className="tap-move-floating-bar" role="status">
          <div className="tap-move-floating-info">
            <span className="tap-move-floating-badge">
              <Pointer size={12} /> Moviendo
            </span>
            <span className="tap-move-floating-name">
              {cursos[cursoAMover]?.nombre}
            </span>
          </div>
          <button
            type="button"
            className="tap-move-cancel-btn"
            onClick={() => setCursoAMover(null)}
            aria-label="Cancelar selección"
          >
            <X size={13} /> Cancelar
          </button>
        </div>
      )}

      {/* Panel Financiero y Presupuesto de dev */}
      <FinancialDrawer />
    </DndContext>
  );
}
