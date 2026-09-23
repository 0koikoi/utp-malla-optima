import { useState, useRef } from 'react';
import { Layers } from 'lucide-react';

export function BienvenidaModal() {
  const [isOpen, setIsOpen] = useState(() => !localStorage.getItem('malla_modal_visto'));
  const checkRef = useRef<HTMLInputElement>(null);

  function handleEntendido() {
    if (checkRef.current?.checked) {
      localStorage.setItem('malla_modal_visto', 'true');
    }
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1055 }}
        onClick={handleEntendido}
      />

      {/* Modal */}
      <div
        className="modal fade show"
        id="modalBienvenida"
        tabIndex={-1}
        aria-labelledby="modal-title"
        aria-modal="true"
        role="dialog"
        style={{ display: 'block', zIndex: 1060 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="mw-head">
              <Layers size={18} style={{ color: '#E8002D', marginRight: '6px' }} />
              <span className="mw-head-title" id="modal-title">Malla Óptima</span>
              <span className="mw-badge">UTP</span>
            </div>
            <div className="mw-body">
              <div className="mw-warn">
                <b>Aviso:</b> Simulador de carga académica y costos.{' '}
                <b>No</b> está enlazado al sistema de matrícula de la UTP y no garantiza
                disponibilidad de cupos ni predice cruces de horarios.
              </div>
              <p className="mw-steps-label">¿Cómo empezar?</p>
              <ol className="mw-steps">
                <li><span className="step-n">1</span><span>Ingresa a tu portal <b>UTP+</b>.</span></li>
                <li><span className="step-n">2</span><span>Ve a <b>Cursos → Avance de plan de estudio</b>.</span></li>
                <li><span className="step-n">3</span><span>Presiona <b>Avance por cursos</b> para ver tu malla.</span></li>
                <li><span className="step-n">4</span><span>Descarga el archivo <b>Plan_de_Estudio.xlsx</b>.</span></li>
                <li><span className="step-n">5</span><span>Súbelo aquí con el botón <b>Subir Malla</b>.</span></li>
              </ol>
            </div>
            <div className="mw-foot">
              <div className="mw-check-wrap">
                <input
                  ref={checkRef}
                  type="checkbox"
                  id="chk-no-mostrar"
                  aria-label="No mostrar de nuevo esta ventana"
                />
                <label htmlFor="chk-no-mostrar">No mostrar de nuevo</label>
              </div>
              <button
                type="button"
                className="btn-start"
                id="btn-entendido"
                onClick={handleEntendido}
              >
                Entendido, comenzar a planificar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
