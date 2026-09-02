// PlannerSection — sección de ciclos regulares y de verano

import { useMallaStore } from '@/store/mallaStore';
import { CicloRow } from './CicloRow';

export function PlannerSection() {
  const { cicloInicio, cicloFin } = useMallaStore();

  const ciclos = [];
  for (let i = cicloInicio; i <= cicloFin; i++) {
    ciclos.push(i);
  }

  return (
    <section id="panel-planificador" aria-label="Planificador de ciclos">
      <p className="planner-section-title">
        <i className="fas fa-calendar-check" />
        {' '}Planificador — Ciclos Regulares
        <span className="title-note">1 al 10, extensibles hasta el 12</span>
      </p>
      <div id="malla-container">
        {ciclos.map((n) => (
          <CicloRow key={`ciclo-${n}`} cicloNum={n} tipo="regular" />
        ))}
      </div>

      <VeranoSection />
    </section>
  );
}

function VeranoSection() {
  const { veranoActivo, cantVeranos } = useMallaStore();

  if (!veranoActivo) return null;

  const veranos = [];
  for (let v = 1; v <= cantVeranos; v++) {
    veranos.push(v);
  }

  return (
    <div id="contenedor-verano-master" style={{ marginTop: '24px' }}>
      <p className="planner-section-title summer">
        <i className="fas fa-sun" />
        {' '}Planificador — Ciclos de Verano
        <span className="title-note">Máx. 11 créditos por verano</span>
      </p>
      <div id="malla-verano-container">
        {veranos.map((v) => (
          <CicloRow key={`verano-${v}`} cicloNum={v} tipo="verano" />
        ))}
      </div>
    </div>
  );
}
