// Controles de rango de ciclos (Del ciclo N al M)

import { useMallaStore } from '@/store/mallaStore';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function RangoCiclos() {
  const { cicloInicio, cicloFin, setCicloInicio, setCicloFin } = useMallaStore();

  function handleInicio(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value);
    if (!isNaN(v)) setCicloInicio(clamp(v, 1, 12));
  }

  function handleFin(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value);
    if (!isNaN(v)) {
      const fin = clamp(v, 1, 12);
      setCicloFin(fin < cicloInicio ? cicloInicio : fin);
    }
  }

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <i className="fas fa-calendar-alt" /> Ciclos (Regular)
      </span>
      <div className="nav-group-body ciclo-inputs">
        <span className="lbl">Del</span>
        <input
          type="number"
          className="ciclo-num"
          id="sim-inicio"
          value={cicloInicio}
          min={1}
          max={12}
          title="Ciclo de inicio"
          onChange={handleInicio}
          onBlur={() => setCicloInicio(clamp(cicloInicio, 1, 12))}
        />
        <span className="sep">—</span>
        <input
          type="number"
          className="ciclo-num"
          id="sim-fin"
          value={cicloFin}
          min={1}
          max={12}
          title="Ciclo de fin"
          onChange={handleFin}
          onBlur={() => setCicloFin(clamp(cicloFin, cicloInicio, 12))}
        />
        <span className="lbl">de 10</span>
      </div>
    </div>
  );
}
