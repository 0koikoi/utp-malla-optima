import { useMallaStore } from '@/store/mallaStore';
import { GraduationCap, SlidersHorizontal } from 'lucide-react';

export function TopBar() {
  const setMenuMobOpen = useMallaStore((s) => s.setMenuMobOpen);

  return (
    <div id="app-topbar">
      <div className="topbar-brand">
        <GraduationCap size={15} className="topbar-logo-icon" />
        <span className="topbar-title">UTP Malla Óptima</span>
        <span className="topbar-badge">Simulador 2026</span>
      </div>
      <span className="topbar-sep" />
      <span className="topbar-note">Sede Ate · Tarifario Oficial 2026 · Referencial</span>

      <button
        type="button"
        className="topbar-mob-menu-btn"
        onClick={() => setMenuMobOpen(true)}
        aria-label="Abrir panel de opciones"
      >
        <SlidersHorizontal size={13} />
        <span>Opciones</span>
      </button>
    </div>
  );
}
