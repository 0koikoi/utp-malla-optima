import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, GraduationCap } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';

export function FacultadDropdown() {
  const tarifario = useAcademicStore((state) => state.tarifario);
  const disciplinaActiva = useAcademicStore((state) => state.disciplinaActiva);
  const setDisciplinaActiva = useAcademicStore((state) => state.setDisciplinaActiva);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState('');
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const botonRef = useRef<HTMLButtonElement>(null);
  const opcionesRef = useRef<HTMLDivElement>(null);
  const facultades = Object.keys(tarifario?.disciplinas ?? {});

  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const boton = botonRef.current;
      const opciones = opcionesRef.current;
      if (!boton || !opciones) return;
      const rect = boton.getBoundingClientRect();
      const ancho = opciones.offsetWidth;
      const alto = opciones.offsetHeight;
      setPosicion({
        top: Math.max(8, rect.bottom + alto + 6 <= window.innerHeight ? rect.bottom + 6 : rect.top - alto - 6),
        left: Math.max(8, Math.min(rect.right - ancho, window.innerWidth - ancho - 8)),
      });
    };
    const alPulsarFuera = (event: Event) => {
      if (event.target instanceof Node && !botonRef.current?.contains(event.target) &&
          !opcionesRef.current?.contains(event.target)) setAbierto(false);
    };
    const alPulsarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    ubicar();
    opcionesRef.current?.querySelector<HTMLElement>('button')?.focus();
    document.addEventListener('pointerdown', alPulsarFuera);
    document.addEventListener('focusin', alPulsarFuera);
    document.addEventListener('keydown', alPulsarTecla);
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => {
      document.removeEventListener('pointerdown', alPulsarFuera);
      document.removeEventListener('focusin', alPulsarFuera);
      document.removeEventListener('keydown', alPulsarTecla);
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', ubicar, true);
    };
  }, [abierto]);

  if (facultades.length === 0) return null;

  const seleccionar = async (facultad: string) => {
    try {
      await setDisciplinaActiva(facultad);
      setError('');
      setAbierto(false);
      botonRef.current?.focus();
    } catch {
      setError('No se pudo guardar la facultad. Inténtalo de nuevo.');
    }
  };

  return <>
    <button ref={botonRef} type="button" className="nav-action secondary faculty-toggle"
      aria-expanded={abierto} aria-controls="faculty-options"
      aria-label={`Facultad: ${disciplinaActiva}`}
      title={`Facultad actual: ${disciplinaActiva}`}
      onClick={() => { setError(''); setAbierto((actual) => !actual); }}>
      <GraduationCap size={17} aria-hidden="true" /> Facultad <ChevronDown size={14} aria-hidden="true" />
    </button>
    {createPortal(<div ref={opcionesRef} id="faculty-options" className="save-as-popover faculty-popover"
      hidden={!abierto} style={posicion} role="group" aria-label="Elegir facultad">
      {facultades.map((facultad) => <button key={facultad} type="button" className="save-as-option faculty-option"
        aria-pressed={facultad === disciplinaActiva} onClick={() => void seleccionar(facultad)}>
        <span>{facultad}</span>{facultad === disciplinaActiva && <Check size={16} aria-hidden="true" />}
      </button>)}
      {error && <p className="faculty-error" role="alert">{error}</p>}
    </div>, document.body)}
  </>;
}
