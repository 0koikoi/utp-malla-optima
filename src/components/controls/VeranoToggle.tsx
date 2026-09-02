// Toggle de verano + input de cantidad de veranos

import { useMallaStore } from '@/store/mallaStore';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function VeranoToggle() {
  const { veranoActivo, cantVeranos, setVeranoActivo, setCantVeranos } = useMallaStore();

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <i className="fas fa-sun" style={{ color: '#F59E0B' }} /> Verano
      </span>
      <div className="nav-group-body verano-row">
        <label className="switch" title="Activar planificador de verano">
          <input
            type="checkbox"
            id="toggle-verano"
            checked={veranoActivo}
            onChange={(e) => setVeranoActivo(e.target.checked)}
          />
          <span className="sw-track" />
        </label>
        <span className={`verano-tag${veranoActivo ? ' on' : ''}`} id="verano-tag">
          {veranoActivo ? 'Activado' : 'Desactivado'}
        </span>
        <div className={`verano-qty-wrap${veranoActivo ? ' show' : ''}`} id="verano-qty-wrap">
          <input
            type="number"
            className="verano-qty"
            id="cant-veranos"
            value={cantVeranos}
            min={1}
            max={5}
            title="Cantidad de veranos"
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) setCantVeranos(clamp(v, 1, 5));
            }}
            onBlur={() => setCantVeranos(clamp(cantVeranos, 1, 5))}
          />
          <span className="verano-mat" id="verano-mat-tag">+S/190 matrícula</span>
        </div>
      </div>
    </div>
  );
}
