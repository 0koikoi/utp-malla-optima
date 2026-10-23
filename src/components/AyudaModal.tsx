import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, X } from 'lucide-react';
import { AyudaPaso } from './AyudaPaso';

interface AyudaModalProps {
  onClose: () => void;
  onFinish?: () => void;
  obligatorio?: boolean;
}

const pasos = [
  { etiqueta: 'Tu Excel', titulo: 'Descarga y sube tu malla UTP', descripcion: 'Empieza con tu plan de estudios: sigue estos cinco pasos.' },
  { etiqueta: 'Tu espacio', titulo: 'Dos espacios para organizarte', descripcion: 'El banco guarda lo que falta ubicar. La malla muestra tu recorrido por periodos.' },
  { etiqueta: 'Mover cursos', titulo: 'Arrastra, suelta y reorganiza', descripcion: 'Drag and drop significa mantener pulsado un curso, llevarlo a otro lugar y soltarlo.' },
  { etiqueta: 'Los cursos', titulo: 'Qué te dice cada tarjeta', descripcion: 'Estos datos te ayudan a decidir dónde ubicar un curso.' },
  { etiqueta: 'Los ciclos', titulo: 'Horas, créditos y costo del ciclo', descripcion: 'Lee el resumen del periodo antes de sumar más cursos.' },
  { etiqueta: 'Herramientas', titulo: 'La barra de herramientas, en sencillo', descripcion: 'Carga tu malla, ajusta tu contexto y guarda el plan cuando esté listo.' },
];

export function AyudaModal({ onClose, onFinish = onClose, obligatorio = false }: AyudaModalProps) {
  const [paso, setPaso] = useState(0);
  const modalRef = useRef<HTMLElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const actual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

  useLayoutEffect(() => {
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    cuerpoRef.current?.scrollTo({ top: 0 });
    tituloRef.current?.focus({ preventScroll: true });
  }, [paso]);

  return (
    <div className="help-backdrop" role="presentation" onMouseDown={() => { if (!obligatorio) onClose(); }}>
      <section
        ref={modalRef}
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            if (!obligatorio) onClose();
          }
          if (event.key !== 'Tab') return;
          const controles = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? []).filter((elemento) => elemento.getClientRects().length > 0);
          const primero = controles[0];
          const ultimo = controles.at(-1);
          if (!primero || !ultimo) return;
          const foco = document.activeElement;
          if (!controles.includes(foco as HTMLElement) ||
              (event.shiftKey && foco === primero) || (!event.shiftKey && foco === ultimo)) {
            event.preventDefault();
            (event.shiftKey ? ultimo : primero).focus();
          }
        }}
      >
        <header className="help-modal-head">
          <div className="help-modal-heading"><CircleHelp size={26} aria-hidden="true" /><div><span>GUÍA DE USO</span><h2 id="help-title">Cómo usar MallaU</h2></div></div>
          {!obligatorio && <button type="button" className="help-close" onClick={onClose} aria-label="Cerrar ayuda"><X size={22} /></button>}
        </header>

        <div className="help-progress">
          <span className="help-step-count" aria-live="polite" aria-atomic="true">Paso {paso + 1} de {pasos.length}</span>
          <nav className="help-step-nav" aria-label="Pasos del tutorial">
            {pasos.map((item, indice) => <button key={item.etiqueta} type="button"
              className={`help-step-dot ${indice < paso ? 'visited' : ''}`}
              aria-label={`Paso ${indice + 1}: ${item.etiqueta}`}
              aria-current={indice === paso ? 'step' : undefined} onClick={() => setPaso(indice)}>
              <span>{indice < paso ? <Check size={13} aria-hidden="true" /> : indice + 1}</span>
              <small>{item.etiqueta}</small>
            </button>)}
          </nav>
        </div>

        <div ref={cuerpoRef} className="help-modal-body">
          <section key={paso} className="help-slide" role="group" aria-roledescription="diapositiva"
            aria-label={`${paso + 1} de ${pasos.length}`}>
            <h3 ref={tituloRef} tabIndex={-1} className="help-slide-title">{actual.titulo}</h3>
            <p className="help-slide-intro">{actual.descripcion}</p>
            <AyudaPaso paso={paso} />
          </section>
        </div>

        <footer className="help-modal-footer">
          <button type="button" className="help-back-btn" disabled={paso === 0} onClick={() => setPaso(paso - 1)}><ArrowLeft size={18} /> Atrás</button>
          <span className="help-next-hint">{esUltimo ? (obligatorio ? 'Siguiente: Configuración' : '¡Ya puedes preparar tu plan!') : `Siguiente: ${pasos[paso + 1].etiqueta}`}</span>
          <button type="button" className="help-continue-btn" onClick={() => esUltimo ? onFinish() : setPaso(paso + 1)}>
            {esUltimo ? 'Finalizar' : 'Continuar'}{esUltimo ? <Check size={18} /> : <ArrowRight size={18} />}
          </button>
        </footer>
      </section>
    </div>
  );
}
