import { useEffect, useRef } from 'react';
import { CalendarDays, CircleHelp, Download, Info, X } from 'lucide-react';

interface AyudaModalProps {
  onClose: () => void;
}

export function AyudaModal({ onClose }: AyudaModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="help-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault();
            closeRef.current?.focus();
          }
        }}
      >
        <header className="help-modal-head">
          <div className="help-modal-heading"><CircleHelp size={22} /><div><span>GUÍA DE USO</span><h2 id="help-title">Cómo usar MallaU</h2></div></div>
          <button ref={closeRef} type="button" className="help-close" onClick={onClose} aria-label="Cerrar ayuda"><X size={19} /></button>
        </header>
        <div className="help-modal-body">
          <section className="help-section">
            <h3><CalendarDays size={17} /> ¿Cómo funcionan los veranos?</h3>
            <p>Indica tu mes de ingreso y ciclo actual en <b>Configuración</b>. El planificador intercala los veranos según el mes elegido:</p>
            <div className="help-summer-grid">
              <div className="help-summer-card">
                <span className="help-period">PERÍODO 1</span>
                <h4>Inicio en marzo</h4>
                <p>El verano aparece después de los ciclos pares: C2, C4, C6, C8 y C10.</p>
                <div className="help-route">C1 → C2 → Verano 2 → C3</div>
              </div>
              <div className="help-summer-card">
                <span className="help-period">PERÍODO 2</span>
                <h4>Inicio en agosto</h4>
                <p>El verano aparece después de los ciclos impares: C1, C3, C5, C7 y C9.</p>
                <div className="help-route">C1 → Verano 1 → C2 → C3</div>
              </div>
            </div>
            <p className="help-hint">Los ciclos hasta el actual se muestran bloqueados. Puedes distribuir los cursos pendientes en los periodos futuros.</p>
          </section>

          <p className="help-notice"><Info size={16} /> <span><b>Aviso:</b> la planificación y los costos son referenciales. MallaU no está enlazado con la matrícula de UTP y no predice cupos ni cruces de horario.</span></p>

          <section className="help-section">
            <h3><Download size={17} /> ¿Cómo descargar y cargar tu malla?</h3>
            <ol className="help-steps">
              <li><span>Ingresa a tu portal <b>UTP+</b>.</span></li>
              <li><span>Ve a <b>Cursos → Avance de plan de estudio</b>.</span></li>
              <li><span>Selecciona <b>Avance por cursos</b> para ver tu malla.</span></li>
              <li><span>Descarga el archivo <b>Plan_de_Estudio.xlsx</b>.</span></li>
              <li><span>Vuelve a MallaU y pulsa <b>Subir Excel</b> para cargarlo.</span></li>
            </ol>
          </section>

          <section className="help-section help-view-section">
            <h3>Controles de visualización</h3>
            <div className="help-view-controls">
              <div><strong>Mostrar desde ciclo</strong><p>Elige el primer ciclo que quieres ver en pantalla. Los ciclos anteriores y sus cursos se conservan; solo se ocultan de la vista.</p></div>
              <div><strong>Mostrar veranos</strong><p>Activa la casilla para ver los veranos disponibles. Si la desactivas, se ocultan los veranos vacíos; los que ya tienen cursos planificados siguen visibles.</p></div>
            </div>
          </section>

          <section className="help-section help-last-section">
            <h3>Después de cargar el Excel</h3>
            <p>Organiza los cursos del <b>Banco de pendientes</b> arrastrándolos o seleccionándolos por toque. Usa <b>Mostrar veranos</b> para ver esos periodos y descarga tu planificación con <b>PNG</b> o <b>PDF</b>.</p>
          </section>
        </div>
      </section>
    </div>
  );
}
