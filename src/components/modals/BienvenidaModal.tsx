import { useState, useRef } from 'react';
import { useMallaStore, type PeriodoIngreso } from '@/store/mallaStore';
import { Layers, Calendar, Sun, Check, X } from 'lucide-react';

export function BienvenidaModal() {
  const {
    bienvenidaModalOpen,
    setBienvenidaModalOpen,
    periodoIngreso,
    setPeriodoIngreso,
  } = useMallaStore();

  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoIngreso>(periodoIngreso);
  const checkRef = useRef<HTMLInputElement>(null);

  const [prevPeriodo, setPrevPeriodo] = useState<PeriodoIngreso>(periodoIngreso);
  if (prevPeriodo !== periodoIngreso) {
    setPrevPeriodo(periodoIngreso);
    setSelectedPeriodo(periodoIngreso);
  }

  function handleGuardarYComenzar() {
    setPeriodoIngreso(selectedPeriodo);
    if (checkRef.current?.checked) {
      localStorage.setItem('malla_modal_visto', 'true');
    }
    setBienvenidaModalOpen(false);
  }

  function handleCerrar() {
    setBienvenidaModalOpen(false);
  }

  if (!bienvenidaModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1055 }}
        onClick={handleCerrar}
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
              <div className="mw-head-left">
                <Layers size={18} style={{ color: '#E8002D' }} />
                <span className="mw-head-title" id="modal-title">Malla Óptima</span>
                <span className="mw-badge">UTP</span>
              </div>
              <button
                type="button"
                className="mw-close-btn"
                onClick={handleCerrar}
                title="Cerrar ventana"
                aria-label="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mw-body">
              {/* Selector de Periodo de Ingreso */}
              <div className="mw-periodo-section">
                <div className="mw-periodo-title">
                  <Calendar size={13} style={{ color: '#F59E0B' }} />
                  <span>¿En qué periodo iniciaste tu carrera?</span>
                </div>
                <p className="mw-periodo-sub">
                  En la UTP, el ciclo de <b>Verano siempre es en Enero</b> (al finalizar el semestre de Agosto).
                  Selecciona tu periodo para intercalar los veranos en tu orden cronológico exacto:
                </p>

                <div className="mw-periodo-grid">
                  {/* Opción Marzo */}
                  <div
                    className={`mw-period-card ${selectedPeriodo === 'marzo' ? 'active' : ''}`}
                    onClick={() => setSelectedPeriodo('marzo')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedPeriodo('marzo')}
                  >
                    <div className="mw-period-card-head">
                      <span className="mw-period-name">Inicio en Marzo</span>
                      <span className="mw-period-tag">Periodo 1</span>
                    </div>
                    <p className="mw-period-desc">
                      Tu año lectivo cursa Mar-Jul (C1) y Ago-Dic (C2). El primer verano es en <b>Enero tras el Ciclo 2</b> (luego tras C4, C6, C8, C10).
                    </p>
                    <div className="mw-period-timeline">
                      <Sun size={11} />
                      <span>C1 → C2 ➔ Verano 1 (Ene) → C3</span>
                      {selectedPeriodo === 'marzo' && <Check size={12} style={{ marginLeft: 'auto', color: '#10B981' }} />}
                    </div>
                  </div>

                  {/* Opción Agosto */}
                  <div
                    className={`mw-period-card ${selectedPeriodo === 'agosto' ? 'active' : ''}`}
                    onClick={() => setSelectedPeriodo('agosto')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedPeriodo('agosto')}
                  >
                    <div className="mw-period-card-head">
                      <span className="mw-period-name">Inicio en Agosto</span>
                      <span className="mw-period-tag">Periodo 2</span>
                    </div>
                    <p className="mw-period-desc">
                      Tu primer ciclo regular finaliza en Diciembre. El primer verano es en <b>Enero inmediatamente tras el Ciclo 1</b> (luego tras C3, C5, C7, C9).
                    </p>
                    <div className="mw-period-timeline">
                      <Sun size={11} />
                      <span>C1 ➔ Verano 1 (Ene) → C2 → C3</span>
                      {selectedPeriodo === 'agosto' && <Check size={12} style={{ marginLeft: 'auto', color: '#10B981' }} />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mw-warn">
                <b>Aviso:</b> Simulador de carga académica y costos.{' '}
                <b>No</b> está enlazado al sistema de matrícula de la UTP y no predice cupos ni cruces de horarios.
              </div>

              <p className="mw-steps-label">¿Cómo cargar tu malla?</p>
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
                  aria-label="No mostrar de nuevo esta ventana al inicio"
                />
                <label htmlFor="chk-no-mostrar">No mostrar automáticamente al iniciar</label>
              </div>
              <button
                type="button"
                className="btn-start"
                id="btn-entendido"
                onClick={handleGuardarYComenzar}
              >
                Guardar y comenzar a planificar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

