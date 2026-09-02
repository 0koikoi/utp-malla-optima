// TopBar — barra de identidad superior
// Usa clases planas definidas en globals.css (#app-topbar, .topbar-title, etc.)

export function TopBar() {
  return (
    <div id="app-topbar">
      <span className="topbar-title">UTP Malla Óptima</span>
      <span className="topbar-badge">Simulador</span>
      <span className="topbar-sep" />
      <span className="topbar-note">Sede Ate · Tarifario 2026 · referencial</span>
    </div>
  );
}
