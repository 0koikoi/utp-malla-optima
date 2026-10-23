import { useMallaStore } from '@/store/mallaStore';
import { Sun } from 'lucide-react';

interface VeranoToggleProps {
  idPrefix?: string;
}

export function VeranoToggle({ idPrefix = '' }: VeranoToggleProps) {
  const { veranoActivo, setVeranoActivo } = useMallaStore();
  const toggleId = `${idPrefix}toggle-verano`;

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <Sun size={12} className="inline-icon" style={{ color: '#F59E0B' }} /> Verano
      </span>
      <div className="nav-group-body verano-row">
        <label className="switch" htmlFor={toggleId} title="Activar simulación de periodos de verano">
          <input
            type="checkbox"
            id={toggleId}
            aria-label="Activar simulación de periodos de verano"
            checked={veranoActivo}
            onChange={(e) => setVeranoActivo(e.target.checked)}
          />
          <span className="sw-track" />
        </label>
        <span className={`verano-tag${veranoActivo ? ' on' : ''}`}>
          {veranoActivo ? 'Ene · Activado' : 'Desactivado'}
        </span>
      </div>
    </div>
  );
}
