import { useState, useEffect } from 'react';
import { useMallaStore } from '@/store/mallaStore';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function VeranoToggle() {
  const { veranoActivo, cantVeranos, setVeranoActivo, setCantVeranos } = useMallaStore();
  const [valVeranos, setValVeranos] = useState(String(cantVeranos));

  useEffect(() => {
    setValVeranos(String(cantVeranos));
  }, [cantVeranos]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      setValVeranos('');
      return;
    }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;

    const clamped = clamp(num, 1, 5);
    setValVeranos(String(clamped));
    setCantVeranos(clamped);
  }

  function handleBlur() {
    if (valVeranos === '' || isNaN(parseInt(valVeranos, 10))) {
      const fallback = clamp(cantVeranos || 3, 1, 5);
      setValVeranos(String(fallback));
      setCantVeranos(fallback);
    } else {
      const num = parseInt(valVeranos, 10);
      const clamped = clamp(num, 1, 5);
      setValVeranos(String(clamped));
      setCantVeranos(clamped);
    }
  }

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
            value={valVeranos}
            min={1}
            max={5}
            title="Cantidad de veranos (1 a 5)"
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <span className="verano-mat" id="verano-mat-tag">+S/190 matrícula</span>
        </div>
      </div>
    </div>
  );
}
