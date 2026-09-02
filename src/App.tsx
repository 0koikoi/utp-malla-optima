// App.tsx — raíz del árbol de componentes

import { BienvenidaModal } from '@/components/modals/BienvenidaModal';
import { TopBar } from '@/components/layout/TopBar';
import { NavBar } from '@/components/layout/NavBar';
import { PendientesPanel } from '@/components/sidebar/PendientesPanel';
import { PlannerSection } from '@/components/planner/PlannerSection';
import { useMallaRestore } from '@/hooks/useMallaRestore';

export default function App() {
  // Restaurar malla guardada al iniciar
  useMallaRestore();

  return (
    <>
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
    </>
  );
}
