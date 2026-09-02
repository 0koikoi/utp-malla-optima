// Dropdowns de Facultad y Pago — controles de configuración del simulador

import { useMallaStore } from '@/store/mallaStore';
import type { FacultadKey, DescuentoKey } from '@/data/tarifario';

// ── Facultad ─────────────────────────────────────────────────────────────────

interface FacultadOption {
  value: FacultadKey;
  label: string;
  shortLabel: string;
  icon: string;
  precio: string;
}

const FACULTADES: FacultadOption[] = [
  {
    value: 'ingenieria',
    label: 'Ingeniería y Arquitectura',
    shortLabel: 'Ingeniería / Arq.',
    icon: 'fa-flask',
    precio: 'S/ 815',
  },
  {
    value: 'gestion',
    label: 'Gestión y Humanidades',
    shortLabel: 'Gestión / Humanas',
    icon: 'fa-briefcase',
    precio: 'S/ 770',
  },
];

export function FacultadDropdown() {
  const { facultad, setFacultad } = useMallaStore();
  const current = FACULTADES.find((f) => f.value === facultad) ?? FACULTADES[0];

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <i className="fas fa-graduation-cap" /> Facultad
      </span>
      <div className="nav-group-body">
        <div className="dropdown nav-dropdown" id="dd-facultad">
          <button
            className="dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            id="btn-facultad"
          >
            <span className="dd-icon">
              <i className={`fas ${current.icon}`} />
            </span>
            <span className="dd-label" id="facultad-label">
              {current.shortLabel}
            </span>
          </button>
          <ul className="dropdown-menu">
            {FACULTADES.map((f) => (
              <li key={f.value}>
                <button
                  className={`dropdown-item${facultad === f.value ? ' active' : ''}`}
                  onClick={() => setFacultad(f.value)}
                >
                  <i className={`fas ${f.icon}`} /> {f.label}
                  <span className="dd-badge">{f.precio}</span>
                </button>
              </li>
            ))}
            <li><hr className="dropdown-divider" /></li>
            <li>
              <span
                className="dropdown-item disabled"
                style={{ fontSize: '0.65rem', color: '#666', cursor: 'default', pointerEvents: 'none' }}
              >
                <i className="fas fa-clock" /> Más facultades — próximamente
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Pago ─────────────────────────────────────────────────────────────────────

interface PagoOption {
  value: DescuentoKey;
  label: string;
  shortLabel: string;
  icon: string;
  porcentaje: string;
}

const PAGOS: PagoOption[] = [
  { value: 'ninguno', label: 'Sin descuento', shortLabel: 'Sin descuento', icon: 'fa-times-circle', porcentaje: '0%' },
  { value: 'bcp', label: 'BCP/Interbank', shortLabel: 'BCP (2.5%)', icon: 'fa-landmark', porcentaje: '2.5%' },
  { value: 'scotiabank', label: 'Scotiabank/BBVA', shortLabel: 'Scotiabank (5%)', icon: 'fa-university', porcentaje: '5%' },
];

export function PagoDropdown() {
  const { descuento, setDescuento } = useMallaStore();
  const current = PAGOS.find((p) => p.value === descuento) ?? PAGOS[2];

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <i className="fas fa-credit-card" /> Método de Pago
      </span>
      <div className="nav-group-body">
        <div className="dropdown nav-dropdown" id="dd-pago">
          <button
            className="dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            id="btn-pago"
          >
            <span className="dd-icon">
              <i className={`fas ${current.icon}`} />
            </span>
            <span className="dd-label" id="pago-label">
              {current.shortLabel}
            </span>
          </button>
          <ul className="dropdown-menu">
            {PAGOS.map((p) => (
              <li key={p.value}>
                <button
                  className={`dropdown-item${descuento === p.value ? ' active' : ''}`}
                  onClick={() => setDescuento(p.value)}
                >
                  <i className={`fas ${p.icon}`} /> {p.label}
                  <span className="dd-badge">{p.porcentaje}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
