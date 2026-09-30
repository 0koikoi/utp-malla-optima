import { useState, useEffect, useRef } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import type { FacultadKey, DescuentoKey } from '@/data/tarifario';
import {
  GraduationCap,
  Briefcase,
  ChevronDown,
  CreditCard,
  Ban,
  Landmark,
  Building2,
  Pill,
  Check,
} from 'lucide-react';

// ── Facultad ─────────────────────────────────────────────────────────────────

interface FacultadOption {
  value: FacultadKey;
  label: string;
  sublabel: string;
  shortLabel: string;
  icon: typeof Building2;
  precio: string;
}

const FACULTADES: FacultadOption[] = [
  {
    value: 'ingenieria',
    label: 'Ingeniería y Arquitectura',
    sublabel: 'Todas las carreras (exc. Salud, Gestión y Humanas)',
    shortLabel: 'Ingeniería / Arq.',
    icon: Building2,
    precio: 'S/ 815',
  },
  {
    value: 'salud_gestion',
    label: 'Salud, Gestión y Humanidades',
    sublabel: 'Excepto Farmacia y Bioquímica',
    shortLabel: 'Salud / Gestión / Hum.',
    icon: Briefcase,
    precio: 'S/ 770',
  },
  {
    value: 'farmacia',
    label: 'Farmacia y Bioquímica',
    sublabel: 'Carrera de Farmacia y Bioquímica',
    shortLabel: 'Farmacia y Bioq.',
    icon: Pill,
    precio: 'S/ 815',
  },
];

interface DropdownProps {
  idPrefix?: string;
}

export function FacultadDropdown({ idPrefix = '' }: DropdownProps) {
  const { facultad, setFacultad } = usePlannerStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mapear compatibilidad si el valor guardado es 'gestion'
  const currentKey = facultad === 'gestion' ? 'salud_gestion' : facultad;
  const current = FACULTADES.find((f) => f.value === currentKey) ?? FACULTADES[0]!;
  const CurrentIcon = current.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const btnId = `${idPrefix}btn-facultad`;

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <GraduationCap size={12} className="inline-icon" /> Facultad / Carrera
      </span>
      <div className="nav-group-body">
        <div
          ref={dropdownRef}
          className={`dropdown nav-dropdown${isOpen ? ' show' : ''}`}
        >
          <button
            className="dropdown-toggle"
            type="button"
            aria-expanded={isOpen}
            id={btnId}
            aria-label="Seleccionar facultad o carrera"
            onClick={() => setIsOpen((prev) => !prev)}
            title="Seleccionar facultad o carrera para el tarifario"
          >
            <span className="dd-icon">
              <CurrentIcon size={14} />
            </span>
            <span className="dd-label">
              {current.shortLabel}
            </span>
            <ChevronDown size={13} className="dd-chevron" />
          </button>
          <ul
            className={`dropdown-menu${isOpen ? ' show' : ''}`}
            style={{ display: isOpen ? 'block' : 'none' }}
          >
            {FACULTADES.map((f) => {
              const ItemIcon = f.icon;
              const isSelected =
                facultad === f.value || (facultad === 'gestion' && f.value === 'salud_gestion');
              return (
                <li key={f.value}>
                  <button
                    type="button"
                    className={`dropdown-item${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      setFacultad(f.value);
                      setIsOpen(false);
                    }}
                  >
                    <ItemIcon size={14} className="item-icon" />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="item-text" style={{ fontWeight: 600 }}>{f.label}</span>
                      <span style={{ fontSize: '0.62rem', color: isSelected ? 'inherit' : '#71717A', opacity: isSelected ? 0.85 : 1, lineHeight: 1.15 }}>
                        {f.sublabel}
                      </span>
                    </div>
                    {isSelected && <Check size={13} className="item-check" />}
                    <span className="dd-badge">{f.precio}</span>
                  </button>
                </li>
              );
            })}
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
  icon: typeof Ban;
  porcentaje: string;
}

const PAGOS: PagoOption[] = [
  { value: 'ninguno', label: 'Sin descuento', shortLabel: 'Sin descuento', icon: Ban, porcentaje: '0%' },
  { value: 'bcp', label: 'BCP/Interbank', shortLabel: 'BCP (2.5%)', icon: Landmark, porcentaje: '2.5%' },
  { value: 'scotiabank', label: 'Scotiabank/BBVA', shortLabel: 'Scotiabank (5%)', icon: Building2, porcentaje: '5%' },
];

export function PagoDropdown({ idPrefix = '' }: DropdownProps) {
  const { descuento, setDescuento } = usePlannerStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = PAGOS.find((p) => p.value === descuento) ?? PAGOS[0]!;
  const CurrentIcon = current.icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const btnId = `${idPrefix}btn-pago`;

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <CreditCard size={12} className="inline-icon" /> Método de Pago
      </span>
      <div className="nav-group-body">
        <div
          ref={dropdownRef}
          className={`dropdown nav-dropdown${isOpen ? ' show' : ''}`}
        >
          <button
            className="dropdown-toggle"
            type="button"
            aria-expanded={isOpen}
            id={btnId}
            aria-label="Seleccionar método de pago"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span className="dd-icon">
              <CurrentIcon size={14} />
            </span>
            <span className="dd-label">
              {current.shortLabel}
            </span>
            <ChevronDown size={13} className="dd-chevron" />
          </button>
          <ul
            className={`dropdown-menu${isOpen ? ' show' : ''}`}
            style={{ display: isOpen ? 'block' : 'none' }}
          >
            {PAGOS.map((p) => {
              const ItemIcon = p.icon;
              const isSelected = descuento === p.value;
              return (
                <li key={p.value}>
                  <button
                    type="button"
                    className={`dropdown-item${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      setDescuento(p.value);
                      setIsOpen(false);
                    }}
                  >
                    <ItemIcon size={14} className="item-icon" />
                    <span className="item-text">{p.label}</span>
                    {isSelected && <Check size={13} className="item-check" />}
                    <span className="dd-badge">{p.porcentaje}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
