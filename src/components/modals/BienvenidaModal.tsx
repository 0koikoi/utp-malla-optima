// Modal de bienvenida — se muestra al primer uso
// Usa Bootstrap 5 (cargado via CDN en index.html)

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    bootstrap: {
      Modal: new (el: HTMLElement) => { show(): void };
    };
  }
}

export function BienvenidaModal() {
  const modalRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalRef.current && !localStorage.getItem('malla_modal_visto')) {
      // Bootstrap 5 está disponible globalmente via CDN
      const modal = new window.bootstrap.Modal(modalRef.current);
      modal.show();
    }
  }, []);

  function handleEntendido() {
    if (checkRef.current?.checked) {
      localStorage.setItem('malla_modal_visto', 'true');
    }
  }

  return (
    <div
      ref={modalRef}
      className="modal fade"
      id="modalBienvenida"
      tabIndex={-1}
      aria-labelledby="modal-title"
      aria-hidden="true"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="mw-head">
            <i className="fas fa-layer-group" style={{ color: '#E8002D' }} />
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
              <input ref={checkRef} type="checkbox" id="chk-no-mostrar" />
              <label htmlFor="chk-no-mostrar">No mostrar de nuevo</label>
            </div>
            <button
              type="button"
              className="btn-start"
              id="btn-entendido"
              data-bs-dismiss="modal"
              onClick={handleEntendido}
            >
              Entendido, comenzar a planificar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
