import { Fragment, useEffect, useState } from 'react';
import { Calculator, Camera, FileSpreadsheet, GraduationCap, Menu, RotateCcw, Settings2, Sun, Upload, X } from 'lucide-react';
import { useAcademicStore } from './store/useAcademicStore';
import { CicloRow } from './components/CicloRow';
import { BancoPendientes } from './components/BancoPendientes';
import { PlanificadorPanel } from './components/PlanificadorPanel';
import { FileUpload } from './components/FileUpLoad';
import { PrerequisitoToast } from './components/PrerequisitoToast';
import { BackupControls } from './components/BackupControls';
import { PDFReport } from './components/PDFReport';
import { Homepage } from './components/Homepage';
import { BienvenidaModal } from './components/BienvenidaModal';
import { exportPlanPNG } from './services/exportPlanPNG';
import { permiteVeranoDespuesDe } from './domain/rules/academicContextRules';
import { MINIMO_CREDITOS_ELECTIVOS } from './domain/rules/planningRules';
import { FinancialConfigurationProvider } from './infrastructure/configuration/FinancialConfigurationProvider';

export default function App() {
  const {
    cursos, cargarDesdeDB, setTarifario, nombreArchivoCargado, perfilCargado,
    periodoIngreso, cicloActual, cursoAMover, setCursoAMover,
    setPanelPlanificadorAbierto, reiniciarPlanificacion,
  } = useAcademicStore();
  const [modalCarga, setModalCarga] = useState(false);
  const [modalContexto, setModalContexto] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);
  const [totalCiclos, setTotalCiclos] = useState(10);
  const [cicloInicioVisible, setCicloInicioVisible] = useState(1);
  const [mostrarVeranos, setMostrarVeranos] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState('');

  useEffect(() => {
    const inicializar = async () => {
      await cargarDesdeDB();
      await setTarifario(FinancialConfigurationProvider.load());
    };
    void inicializar();
  }, [cargarDesdeDB, setTarifario]);

  useEffect(() => {
    if (cicloActual) setTotalCiclos((actual) => Math.max(actual, cicloActual));
  }, [cicloActual]);

  if (!perfilCargado) return <div className="app-loading" role="status">Cargando planificación…</div>;
  if (cursos.length === 0) return <Homepage />;

  const sinContexto = !periodoIngreso || !cicloActual;
  const pendientesBanco = cursos.filter((curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'banco');
  const llevados = cursos.filter((curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO').length;
  const planificados = cursos.filter((curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo').length;
  const creditosElectivos = cursos.filter((curso) => curso.tipo === 'ELECTIVO' &&
    (curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO' || curso.ubicacion === 'periodo'))
    .reduce((suma, curso) => suma + curso.creditos, 0);
  const ciclos = Array.from({ length: totalCiclos - cicloInicioVisible + 1 }, (_, index) => cicloInicioVisible + index);

  const descargarPNG = async () => {
    setExportando(true);
    setErrorExportar('');
    try {
      await exportPlanPNG(cursos, totalCiclos, cicloActual, periodoIngreso);
    } catch {
      setErrorExportar('No se pudo generar el PNG.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="academic-app">
      <header id="app-topbar">
        <span className="topbar-brand"><GraduationCap size={19} className="topbar-logo-icon" /><b className="topbar-title">MallaU · Academic Planner</b></span>
        <span className="topbar-badge">UTP</span><span className="topbar-sep" />
        <span className="topbar-note">Planificación curricular · simulación referencial</span>
        <button type="button" className="topbar-mob-menu-btn" onClick={() => setMenuMovil((actual) => !actual)} aria-label="Abrir menú" aria-expanded={menuMovil}><Menu size={19} /></button>
      </header>

      <nav id="app-nav" className={menuMovil ? 'integration-nav-open' : ''} aria-label="Controles principales">
        <div className="nav-group"><span className="nav-group-label"><FileSpreadsheet size={12} /> Malla</span>
          <button type="button" className="nav-control-btn" onClick={() => setModalCarga(true)}><Upload size={14} /> {nombreArchivoCargado ? 'Actualizar Excel' : 'Subir Excel'}</button>
        </div>
        <div className="nav-divider" />
        <div className="nav-group"><span className="nav-group-label">Avance</span><span className="nav-progress">{llevados} llevados · {planificados} planificados · {pendientesBanco.length} pendientes</span></div>
        <div className="nav-divider" />
        <div className="nav-group" title={`Créditos electivos mínimos: ${MINIMO_CREDITOS_ELECTIVOS}`}><span className="nav-group-label">Electivos</span><span className="nav-chip-electivos">{creditosElectivos} / {MINIMO_CREDITOS_ELECTIVOS} cr</span></div>
        <div className="nav-spacer" />
        <button type="button" className="nav-action secondary" onClick={() => setModalContexto(true)}><Settings2 size={14} /> Configuración</button>
        <button type="button" className="nav-action secondary" onClick={() => void reiniciarPlanificacion()}><RotateCcw size={14} /> Limpiar plan</button>
        <BackupControls />
        <button type="button" className="nav-action secondary" onClick={() => void descargarPNG()} disabled={exportando}><Camera size={14} /> {exportando ? 'Generando…' : 'PNG'}</button>
        <PDFReport cursos={cursos} />
        <button type="button" className="nav-action primary" onClick={() => setPanelPlanificadorAbierto(true)}><Calculator size={14} /> Estrategia</button>
      </nav>

      <div className="integration-settings">
        <label htmlFor="visible-start">Mostrar desde ciclo</label>
        <select id="visible-start" value={cicloInicioVisible} onChange={(event) => setCicloInicioVisible(Number(event.target.value))}>
          {Array.from({ length: totalCiclos }, (_, index) => index + 1).map((numero) => <option key={numero} value={numero}>{numero}</option>)}
        </select>
        <label className="summer-switch"><input type="checkbox" checked={mostrarVeranos} onChange={(event) => setMostrarVeranos(event.target.checked)} /> <Sun size={14} /> Mostrar veranos</label>
        <span>Inicio: {periodoIngreso === 'agosto' ? 'agosto' : 'marzo'} · Ciclo actual: {cicloActual}</span>
      </div>

      <main id="app-main">
        <BancoPendientes cursosPendientes={pendientesBanco} />
        <section id="panel-planificador" aria-label="Planificador por ciclos">
          <div className="planner-heading"><div><span className="planner-section-title">Planificación regular y verano</span><h1>Malla proyectada</h1>
            <p>Los ciclos hasta el actual están bloqueados. Arrastra cursos pendientes a periodos futuros o selecciónalos por toque.</p></div></div>
          <div id="malla-container">
            {ciclos.map((numero) => {
              const cursosVerano = cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'VERANO' && curso.ciclo === numero);
              return <Fragment key={numero}>
                <CicloRow numCiclo={numero} cursos={cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === numero)} />
                {periodoIngreso && (permiteVeranoDespuesDe(numero, periodoIngreso) || cursosVerano.length > 0) && (mostrarVeranos || cursosVerano.length > 0) &&
                  <CicloRow numCiclo={numero} tipoPeriodo="VERANO" cursos={cursosVerano} habilitado={permiteVeranoDespuesDe(numero, periodoIngreso)} />}
              </Fragment>;
            })}
            {totalCiclos < 12 && <button type="button" className="add-cycle-btn" onClick={() => setTotalCiclos((actual) => Math.min(12, actual + 1))}>+ Añadir ciclo {totalCiclos + 1}</button>}
          </div>
        </section>
      </main>

      <PlanificadorPanel /><PrerequisitoToast />
      {cursoAMover && <div className="tap-move-floating-bar" role="status"><span>Moviendo {cursos.find((curso) => curso.codigo === cursoAMover)?.nombre}</span><button type="button" onClick={() => setCursoAMover(null)}><X size={14} /> Cancelar</button></div>}
      {errorExportar && <div className="integration-error" role="alert">{errorExportar}</div>}
      {(sinContexto || modalContexto) && <BienvenidaModal onClose={() => setModalContexto(false)} />}
      {modalCarga && <div className="upload-modal-backdrop" role="presentation" onMouseDown={() => setModalCarga(false)}><div className="upload-modal" role="dialog" aria-modal="true" aria-label="Cargar malla" onMouseDown={(event) => event.stopPropagation()}><div className="upload-modal-head"><h2>Actualizar plan de estudios</h2><button type="button" onClick={() => setModalCarga(false)} aria-label="Cerrar"><X size={18} /></button></div><p>Al cargar una malla nueva se reinicia la planificación manual.</p><FileUpload onSuccess={() => setModalCarga(false)} /></div></div>}
    </div>
  );
}
