import { Fragment, useEffect, useState } from 'react';
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
import { BackupControls } from './components/BackupControls';
import { PDFReport } from './components/PDFReport';
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
  const [totalCiclos, setTotalCiclos] = useState(10);
  const ciclos = Array.from({ length: totalCiclos }, (_, index) => index + 1);

  useEffect(() => {
    const inicializar = async () => {
      await cargarDesdeDB();
      // costos.json es la configuración base versionada del proyecto. Se vuelve
      // a sincronizar al iniciar para que una copia antigua persistida en
      // IndexedDB no conserve límites/tarifas obsoletos después de actualizar
      // la aplicación.
      await setTarifario(defaultCostos as unknown as Tarifario);
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
    (curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo'
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

        <BackupControls />
        <PDFReport cursos={cursos} />

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
                  <span className="planner-section-title">Planificación regular + verano</span>
                  <h1>Malla proyectada</h1>
                  <p>Arrastra solo cursos pendientes. Hay un verano disponible después de cada ciclo y los periodos anteriores quedan bloqueados.</p>
                </div>
                <div className="planner-legend" aria-label="Leyenda">
                  <span><i className="legend-dot obligatorio" /> Obligatorio</span>
                  <span><i className="legend-dot electivo" /> Electivo</span>
                  <span><i className="legend-dot aprobado" /> Aprobado / convalidado</span>
                </div>
              </div>

              <div id="malla-container">
                {ciclos.map((numCiclo) => (
                  <Fragment key={numCiclo}>
                    <CicloRow
                      numCiclo={numCiclo}
                      tipoPeriodo="REGULAR"
                      cursos={cursos.filter(
                        (curso) =>
                          curso.ubicacion === 'periodo' &&
                          curso.tipoPeriodo === 'REGULAR' &&
                          curso.ciclo === numCiclo
                      )}
                    />
                    <CicloRow
                      numCiclo={numCiclo}
                      tipoPeriodo="VERANO"
                      cursos={cursos.filter(
                        (curso) =>
                          curso.ubicacion === 'periodo' &&
                          curso.tipoPeriodo === 'VERANO' &&
                          curso.ciclo === numCiclo
                      )}
                    />
                  </Fragment>
                ))}
                {totalCiclos < 12 && (
                  <button
                    type="button"
                    className="add-cycle-btn"
                    onClick={() => setTotalCiclos((actual) => Math.min(12, actual + 1))}
                  >
                    + Añadir ciclo {totalCiclos + 1}
                  </button>
                )}
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
