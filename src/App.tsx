import { useEffect, useState } from 'react';
import {
  Calculator,
  FileSpreadsheet,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useAcademicStore } from './store/useAcademicStore';
import { CicloRow } from './components/CicloRow';
import { BancoPendientes } from './components/BancoPendientes';
import { PlanificadorPanel } from './components/PlanificadorPanel';
import { FileUpload } from './components/FileUpLoad';
import { DisciplineSelector } from './components/DisciplineSelector';
import { PrerequisitoToast } from './components/PrerequisitoToast';
import defaultCostos from './data/universidades/pe-utp/costos.json';
import type { Tarifario } from './types/academic';

export const App = () => {
  const {
    cursos,
    setTarifario,
    cargarDesdeDB,
    cursosSeleccionadosParaMatricula,
    setPanelPlanificadorAbierto,
    reiniciarPlanificacion,
    nombreArchivoCargado,
    cursoAMover,
    setCursoAMover,
  } = useAcademicStore();

  const [mostrarModalCarga, setMostrarModalCarga] = useState(false);
  const ciclos = Array.from({ length: 10 }, (_, index) => index + 1);

  useEffect(() => {
    const inicializar = async () => {
      await cargarDesdeDB();
      if (!useAcademicStore.getState().tarifario) {
        await setTarifario(defaultCostos as unknown as Tarifario);
      }
    };
    void inicializar();
  }, [cargarDesdeDB, setTarifario]);

  const cursosPendientesBanco = cursos.filter(
    (curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'banco'
  );
  const cursosLlevados = cursos.filter(
    (curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO'
  ).length;
  const cursosPlanificados = cursos.filter(
    (curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'ciclo'
  ).length;

  return (
    <div className="academic-app">
      <div id="app-topbar">
        <span className="topbar-title">Academic Planner</span>
        <span className="topbar-badge">UTP</span>
        <span className="topbar-sep" />
        <span className="topbar-note">Planificación curricular · offline-first · simulación referencial</span>
      </div>

      <nav id="app-nav" aria-label="Controles principales">
        <div className="nav-brand-mobile">
          <GraduationCap size={18} />
          <b>Academic Planner</b>
        </div>

        <div className="nav-group">
          <span className="nav-group-label"><FileSpreadsheet size={11} /> Malla</span>
          <button type="button" className="nav-control-btn" onClick={() => setMostrarModalCarga(true)}>
            <Upload size={14} />
            <span>{nombreArchivoCargado ? 'Actualizar Excel' : 'Subir Excel'}</span>
          </button>
        </div>

        <div className="nav-divider" />

        <div className="nav-group nav-discipline-group">
          <span className="nav-group-label"><GraduationCap size={11} /> Disciplina</span>
          <DisciplineSelector />
        </div>

        <div className="nav-divider" />

        <div className="nav-group nav-status-group">
          <span className="nav-group-label"><ShieldCheck size={11} /> Avance</span>
          <div className="nav-status-chips">
            <span><b>{cursosLlevados}</b> llevados</span>
            <span><b>{cursosPlanificados}</b> planificados</span>
            <span><b>{cursosPendientesBanco.length}</b> pendientes</span>
          </div>
        </div>

        <div className="nav-spacer" />

        {cursoAMover && (
          <button type="button" className="nav-cancel-move" onClick={() => setCursoAMover(null)}>
            Cancelar movimiento
          </button>
        )}

        <button
          type="button"
          className="nav-action secondary"
          onClick={() => void reiniciarPlanificacion()}
          disabled={cursos.length === 0}
        >
          <RotateCcw size={14} /> Limpiar plan
        </button>

        <button
          type="button"
          className="nav-action primary"
          onClick={() => setPanelPlanificadorAbierto(true)}
        >
          <Calculator size={14} /> Planificador ({cursosSeleccionadosParaMatricula.length})
        </button>
      </nav>

      <main id="app-main">
        <BancoPendientes cursosPendientes={cursosPendientesBanco} />

        <section id="panel-planificador" aria-label="Planificador por ciclos">
          {cursos.length === 0 ? (
            <div className="empty-planner">
              <div className="empty-planner-icon"><GraduationCap size={28} /></div>
              <span className="planner-section-title">Organizador Curricular Universitario</span>
              <h1>Proyecta tu malla antes de matricularte</h1>
              <p>
                Sube el Excel de avance de plan de estudios. Los cursos aprobados quedarán fijos en su ciclo y los pendientes aparecerán en el banco lateral.
              </p>
              <FileUpload onSuccess={() => setMostrarModalCarga(false)} />
            </div>
          ) : (
            <>
              <div className="planner-heading">
                <div>
                  <span className="planner-section-title">Planificación regular</span>
                  <h1>Malla proyectada</h1>
                  <p>Arrastra solo cursos pendientes. Los cursos ya llevados están bloqueados.</p>
                </div>
                <div className="planner-legend" aria-label="Leyenda">
                  <span><i className="legend-dot obligatorio" /> Obligatorio</span>
                  <span><i className="legend-dot electivo" /> Electivo</span>
                  <span><i className="legend-dot aprobado" /> Aprobado / convalidado</span>
                </div>
              </div>

              <div id="malla-container">
                {ciclos.map((numCiclo) => (
                  <CicloRow
                    key={numCiclo}
                    numCiclo={numCiclo}
                    cursos={cursos.filter(
                      (curso) => curso.ubicacion === 'ciclo' && curso.ciclo === numCiclo
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <PlanificadorPanel />
      <PrerequisitoToast />

      {mostrarModalCarga && (
        <div className="upload-modal-backdrop" role="presentation" onMouseDown={() => setMostrarModalCarga(false)}>
          <div className="upload-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="upload-modal-head">
              <div>
                <span>Archivo de avance</span>
                <h2>{cursos.length > 0 ? 'Actualizar plan de estudios' : 'Cargar plan de estudios'}</h2>
              </div>
              <button type="button" onClick={() => setMostrarModalCarga(false)} aria-label="Cerrar">×</button>
            </div>
            <p>Al cargar una nueva malla se reinicia la planificación manual, pero se conserva el tarifario local.</p>
            <FileUpload onSuccess={() => setMostrarModalCarga(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
