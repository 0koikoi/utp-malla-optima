import { useState } from 'react';
import { useMallaStore } from '@/store/mallaStore';
import { Sun } from 'lucide-react';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

interface VeranoToggleProps {
  idPrefix?: string;
}

export function VeranoToggle({ idPrefix = '' }: VeranoToggleProps) {
  const { veranoActivo, cantVeranos, setVeranoActivo, setCantVeranos } = useMallaStore();
  const toggleId = `${idPrefix}toggle-verano`;
  const cantId = `${idPrefix}cant-veranos`;

  const [valVeranos, setValVeranos] = useState(String(cantVeranos));
  const [prevCant, setPrevCant] = useState(cantVeranos);

  if (cantVeranos !== prevCant) {
    setPrevCant(cantVeranos);
    setValVeranos(String(cantVeranos));
  }

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
        <Sun size={12} className="inline-icon" style={{ color: '#F59E0B' }} /> Verano
      </span>
      <div className="nav-group-body verano-row">
        <label className="switch" htmlFor={toggleId} title="Activar planificador de verano">
          <input
            type="checkbox"
            id={toggleId}
            aria-label="Activar cursos de verano"
            checked={veranoActivo}
            onChange={(e) => setVeranoActivo(e.target.checked)}
          />
          <span className="sw-track" />
        </label>
        <span className={`verano-tag${veranoActivo ? ' on' : ''}`}>
          {veranoActivo ? 'Activado' : 'Desactivado'}
        </span>
        <div className={`verano-qty-wrap${veranoActivo ? ' show' : ''}`}>
          <label htmlFor={cantId} className="visually-hidden" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            Cantidad de veranos
          </label>
          <input
            type="number"
            className="verano-qty"
            id={cantId}
            aria-label="Cantidad de veranos"
            value={valVeranos}
            min={1}
            max={5}
            title="Cantidad de veranos (1 a 5)"
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <span className="verano-mat">+S/190 matrícula</span>
        </div>
      </div>
    </div>
  );
}
