import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Download, FileDown, Image } from 'lucide-react';
import type { Curso } from '../types/academic';
import { useAcademicStore } from '../store/useAcademicStore';
import { exportAcademicBackup } from '../application/usecases/exportAcademicBackup';
import { downloadBlob } from '../services/backupService';
import { PDFReport } from './PDFReport';

interface Props {
  cursos: Curso[];
  exportandoPNG: boolean;
  onGuardarPNG: () => Promise<void>;
}

export function SaveAsMenu({ cursos, exportandoPNG, onGuardarPNG }: Props) {
  const tarifario = useAcademicStore((state) => state.tarifario);
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const botonRef = useRef<HTMLButtonElement>(null);
  const opcionesRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const boton = botonRef.current;
      const opciones = opcionesRef.current;
      if (!boton || !opciones) return;
      const rect = boton.getBoundingClientRect();
      const ancho = opciones.offsetWidth;
      const alto = opciones.offsetHeight;
      const top = rect.bottom + alto + 6 <= window.innerHeight ? rect.bottom + 6 : rect.top - alto - 6;
      const siguiente = { top: Math.max(8, top), left: Math.max(8, Math.min(rect.right - ancho, window.innerWidth - ancho - 8)) };
      setPosicion((actual) => actual.top === siguiente.top && actual.left === siguiente.left ? actual : siguiente);
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
    opcionesRef.current?.querySelector<HTMLElement>('a[href], button:not(:disabled)')?.focus();
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

  const cerrar = () => {
    setAbierto(false);
    botonRef.current?.focus();
  };

  return <>
    <button ref={botonRef} type="button" className="nav-action secondary save-as-toggle"
      disabled={cursos.length === 0} aria-expanded={abierto} aria-controls="save-as-options"
      onClick={() => setAbierto((actual) => !actual)}>
      <FileDown size={17} aria-hidden="true" /> Guardar como <ChevronDown size={14} aria-hidden="true" />
    </button>
    {createPortal(<div ref={opcionesRef} id="save-as-options" className="save-as-popover"
      hidden={!abierto} style={posicion} role="group" aria-label="Opciones de guardado">
      <PDFReport cursos={cursos} className="save-as-option" onDownload={cerrar} />
      <button type="button" className="save-as-option" disabled={exportandoPNG} onClick={() => {
        cerrar();
        void onGuardarPNG();
      }}><Image size={17} aria-hidden="true" /><span>{exportandoPNG ? 'Generando PNG…' : 'PNG'}</span></button>
      <button type="button" className="save-as-option" onClick={() => {
        downloadBlob(exportAcademicBackup(cursos, tarifario), 'avance_academico.json');
        cerrar();
      }}><Download size={17} aria-hidden="true" /><span>Respaldo</span></button>
    </div>, document.body)}
  </>;
}
