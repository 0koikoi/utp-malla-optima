import { useEffect, useState } from 'react';
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
import { Homepage } from '@/components/home/Homepage';
import { BienvenidaModal } from '@/components/modals/BienvenidaModal';
import { TopBar } from '@/components/layout/TopBar';
import { NavBar } from '@/components/layout/NavBar';
import { ConfigSidebar } from '@/components/layout/ConfigSidebar';
import { MobileMenuModal } from '@/components/layout/MobileMenuModal';
import { PendientesPanel } from '@/components/sidebar/PendientesPanel';
import { PlannerSection } from '@/components/planner/PlannerSection';
import { CursoCard } from '@/components/planner/CursoCard';
import { PrerequisitoToast } from '@/components/common/PrerequisitoToast';
import { useMallaStore } from '@/store/mallaStore';
import type { Curso, UbicacionCurso } from '@/types/malla';

import { Pointer, X } from 'lucide-react';

export default function App() {

  const {
    cursos,
    setDrawerMobOpen,
    nombreArchivoCargado,
    blockedInfo,
    cascadaAlerta,
    setBlockedInfo,
    setCascadaAlerta,
    ejecutarMovimiento,
    cursoAMover,
    setCursoAMover,
  } = useMallaStore();

  const [activeCurso, setActiveCurso] = useState<Curso | null>(null);

  const hayMallaCargada = !!nombreArchivoCargado && Object.keys(cursos).length > 0;

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
    const destino = String(over.id) as UbicacionCurso;
    ejecutarMovimiento(codigoCurso, destino);

    // Cerrar el drawer de pendientes en móvil al soltar en un ciclo
    if (window.matchMedia('(max-width: 640px)').matches) {
      setDrawerMobOpen(false);
    }
  }

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
        <BancoPendientes cursosPendientes={cursosPendientesBanco} />

        <section id="panel-planificador" aria-label="Planificador por ciclos">
          {cursos.length === 0 ? (
            <div className="empty-planner">
              <div className="empty-planner-icon"><GraduationCap size={28} /></div>
              <span className="planner-section-title">Organizador Curricular Universitario</span>
              <h1>Proyecta tu malla antes de matricularte</h1>
              <p>
                Sube el Excel de avance de plan de estudios. Los cursos aprobados quedarán fijos en su ciclo y los pendientes aparecerán en el banco lateral.
              </p>
              <FileUpload onSuccess={() => setMostrarModalCarga(false)} />
            </div>
          ) : (
            <>
              <div className="planner-heading">
                <div>
                  <span className="planner-section-title">Planificación regular</span>
                  <h1>Malla proyectada</h1>
                  <p>Arrastra solo cursos pendientes. Los cursos ya llevados están bloqueados.</p>
                </div>
                <div className="planner-legend" aria-label="Leyenda">
                  <span><i className="legend-dot obligatorio" /> Obligatorio</span>
                  <span><i className="legend-dot electivo" /> Electivo</span>
                  <span><i className="legend-dot aprobado" /> Aprobado / convalidado</span>
                </div>
              </div>

              <div id="malla-container">
                {ciclos.map((numCiclo) => (
                  <CicloRow
                    key={numCiclo}
                    numCiclo={numCiclo}
                    cursos={cursos.filter(
                      (curso) => curso.ubicacion === 'ciclo' && curso.ciclo === numCiclo
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Drag overlay flotante mientras se arrastra */}
      <DragOverlay dropAnimation={null}>
        {activeCurso ? <CursoCard curso={activeCurso} isOverlay /> : null}
      </DragOverlay>

      {/* Toast de bloqueo por prerrequisitos */}
      {blockedInfo && (
        <PrerequisitoToast
          cursoNombre={blockedInfo.cursoNombre}
          faltantes={blockedInfo.faltantes}
          tipo="bloqueo"
          onClose={() => setBlockedInfo(null)}
        />
      )}

      {/* Toast de advertencia por rupturas en cascada */}
      {cascadaAlerta && (
        <PrerequisitoToast
          cursoNombre={cascadaAlerta.cursoNombre}
          faltantes={cascadaAlerta.faltantes}
          tipo="cascada"
          onClose={() => setCascadaAlerta(null)}
        />
      )}

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
    </DndContext>
  );
};

export default App;
