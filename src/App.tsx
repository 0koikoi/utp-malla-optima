import { formatCredits } from './utils/formatCredits';
import { APP_NAME, APP_SUBTITLE } from './config/appIdentity';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Calculator, CircleHelp, FileSpreadsheet, GraduationCap, Menu, Moon, Plus, RotateCcw, Settings2, Sun, Upload, X } from 'lucide-react';
import { useAcademicStore } from './store/useAcademicStore';
import { CicloRow } from './components/CicloRow';
import { BancoPendientes } from './components/BancoPendientes';
import { PlanificadorPanel } from './components/PlanificadorPanel';
import { FileUpload } from './components/FileUpLoad';
import { PrerequisitoToast } from './components/PrerequisitoToast';
import { BackupControls } from './components/BackupControls';
import { SaveAsMenu } from './components/SaveAsMenu';
import { BienvenidaModal } from './components/BienvenidaModal';
import { AyudaModal } from './components/AyudaModal';
import { exportPlanPNG } from './services/exportPlanPNG';
import { permiteVeranoDespuesDe } from './domain/rules/academicContextRules';
import { MINIMO_CREDITOS_ELECTIVOS } from './domain/rules/planningRules';
import { obtenerCiclosDisponibles, obtenerSiguienteCiclo } from './domain/rules/cycleRules';
import { FinancialConfigurationProvider } from './infrastructure/configuration/FinancialConfigurationProvider';

export default function App() {
  const {
    cursos, cargarDesdeDB, setTarifario, nombreArchivoCargado, perfilCargado,
    periodoIngreso, cicloActual, cursoAMover, setCursoAMover,
    totalCiclos, ciclosExcluidos, agregarCiclo,
    setPanelPlanificadorAbierto, reiniciarPlanificacion,
  } = useAcademicStore();
  const [modalCarga, setModalCarga] = useState(false);
  const [modalContexto, setModalContexto] = useState(false);
  const [modalAyuda, setModalAyuda] = useState(false);
  const [tutorialCompletado, setTutorialCompletado] = useState(() => {
    try {
      return window.localStorage.getItem('mallau-tutorial-completado') === '1';
    } catch {
      return false;
    }
  });
  const [menuMovil, setMenuMovil] = useState(false);
  const [cicloInicioVisible, setCicloInicioVisible] = useState(1);
  const [mostrarVeranos, setMostrarVeranos] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState('');
  const barrasRef = useRef<HTMLDivElement>(null);
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    try {
      return window.localStorage.getItem('mallau-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      window.localStorage.setItem('mallau-theme', tema);
    } catch {
      // El cambio sigue funcionando cuando el navegador no permite guardar preferencias.
    }
  }, [tema]);

  useEffect(() => {
    const inicializar = async () => {
      await cargarDesdeDB();
      await setTarifario(FinancialConfigurationProvider.load());
    };
    void inicializar();
  }, [cargarDesdeDB, setTarifario]);

  useLayoutEffect(() => {
    const barras = barrasRef.current;
    if (!barras) return;
    const ajustarAltura = () => document.documentElement.style.setProperty('--chrome-h', `${barras.getBoundingClientRect().height}px`);
    ajustarAltura();
    const observador = new ResizeObserver(ajustarAltura);
    observador.observe(barras);
    return () => {
      observador.disconnect();
      document.documentElement.style.removeProperty('--chrome-h');
    };
  }, [perfilCargado]);

  if (!perfilCargado) return <div className="app-loading" role="status">Cargando planificación…</div>;
  const sinMalla = cursos.length === 0;

  const sinContexto = !periodoIngreso || !cicloActual;
  const mostrarTutorialInicial = sinContexto && !tutorialCompletado;
  const mostrarAyuda = mostrarTutorialInicial || modalAyuda;
  const mostrarConfiguracion = !mostrarAyuda && (modalContexto || (sinContexto && tutorialCompletado));
  const pendientesBanco = cursos.filter((curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'banco');
  const llevados = cursos.filter((curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO').length;
  const planificados = cursos.filter((curso) => curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo').length;
  const creditosElectivos = cursos.filter((curso) => curso.tipo === 'ELECTIVO' &&
    (curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO' || curso.ubicacion === 'periodo'))
    .reduce((suma, curso) => suma + curso.creditos, 0);
  const ciclosDisponibles = obtenerCiclosDisponibles(totalCiclos, ciclosExcluidos);
  const inicioVisible = ciclosDisponibles.includes(cicloInicioVisible) ? cicloInicioVisible
    : ciclosDisponibles.find((ciclo) => ciclo >= cicloInicioVisible) ?? ciclosDisponibles.at(-1) ?? 1;
  const ciclos = Array.from({ length: Math.max(0, totalCiclos - inicioVisible + 1) }, (_, index) => inicioVisible + index);
  const siguienteCiclo = obtenerSiguienteCiclo(totalCiclos, ciclosExcluidos);

  const descargarPNG = async () => {
    setExportando(true);
    setErrorExportar('');
    try {
      await exportPlanPNG(cursos, totalCiclos, cicloActual, periodoIngreso, ciclosExcluidos);
    } catch {
      setErrorExportar('No se pudo generar el PNG.');
    } finally {
      setExportando(false);
    }
  };

  const finalizarTutorialInicial = () => {
    setTutorialCompletado(true);
    setModalAyuda(false);
    try {
      window.localStorage.setItem('mallau-tutorial-completado', '1');
    } catch {
      // La configuración se abre igualmente si no se puede guardar la preferencia.
    }
  };

  return (
    <div className="academic-app">
      <div ref={barrasRef} className="app-chrome">
      <header id="app-topbar">
        <span className="topbar-brand"><GraduationCap size={23} className="topbar-logo-icon" /><b className="topbar-title">{APP_NAME}<span className="topbar-title-extended"> · {APP_SUBTITLE}</span></b></span>
        <span className="topbar-badge">UTP</span><span className="topbar-sep" />
        <span className="topbar-note">Sede Ate - Tarifario Oficial 2026 Referencial</span>
        <button type="button" className="topbar-help-btn" onClick={() => setModalAyuda(true)} aria-label="Ayuda: cómo usar MallaU" title="Ayuda: cómo usar MallaU"><CircleHelp size={20} /></button>
        <button type="button" className="theme-toggle" onClick={() => setTema((actual) => actual === 'light' ? 'dark' : 'light')} aria-label={tema === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'} aria-pressed={tema === 'dark'} title={tema === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}>{tema === 'light' ? <Moon size={18} /> : <Sun size={18} />}<span className="theme-toggle-label">{tema === 'light' ? 'Modo oscuro' : 'Modo claro'}</span></button>
        <button type="button" className="topbar-mob-menu-btn" onClick={() => setMenuMovil((actual) => !actual)} aria-label="Abrir menú" aria-expanded={menuMovil}><Menu size={22} /></button>
      </header>

      <nav id="app-nav" className={menuMovil ? 'integration-nav-open' : ''} aria-label="Controles principales">
        <div className="nav-group"><span className="nav-group-label"><FileSpreadsheet size={12} /> Malla</span>
          <button type="button" className="nav-control-btn" onClick={() => setModalCarga(true)}><Upload size={14} /> {nombreArchivoCargado ? 'Actualizar Excel' : 'Subir Excel'}</button>
        </div>
        <div className="nav-divider" />
        <div className="nav-group"><span className="nav-group-label">Avance</span><span className="nav-progress">{llevados} llevados · {planificados} planificados · {pendientesBanco.length} pendientes</span></div>
        <div className="nav-divider" />
        <div className="nav-group" title={`Créditos electivos mínimos: ${MINIMO_CREDITOS_ELECTIVOS}`}><span className="nav-group-label">Electivos</span><span className="nav-chip-electivos">{formatCredits(creditosElectivos)} / {MINIMO_CREDITOS_ELECTIVOS} cr</span></div>
        <div className="nav-spacer" />
        <button type="button" className="nav-action secondary" onClick={() => setModalContexto(true)}><Settings2 size={14} /> Configuración</button>
        <button type="button" className="nav-action secondary" onClick={() => void reiniciarPlanificacion()}><RotateCcw size={14} /> Limpiar plan</button>
        <BackupControls />
        <SaveAsMenu cursos={cursos} exportandoPNG={exportando} onGuardarPNG={descargarPNG} />
        <button type="button" className="nav-action primary" onClick={() => setPanelPlanificadorAbierto(true)}><Calculator size={14} /> Estrategia</button>
      </nav>

      {!sinMalla && <div className="integration-settings">
        <label htmlFor="visible-start">Mostrar desde ciclo</label>
        <select id="visible-start" value={inicioVisible} onChange={(event) => setCicloInicioVisible(Number(event.target.value))}>
          {ciclosDisponibles.map((numero) => <option key={numero} value={numero}>{numero}</option>)}
        </select>
        <label className="summer-switch"><input type="checkbox" checked={mostrarVeranos} onChange={(event) => setMostrarVeranos(event.target.checked)} /> <Sun size={14} /> Mostrar veranos</label>
        <span>Inicio: {periodoIngreso === 'agosto' ? 'agosto' : 'marzo'} · Ciclo actual: {cicloActual}</span>
      </div>}
      </div>

      <main id="app-main">
        <BancoPendientes cursosPendientes={pendientesBanco} />
        <section id="panel-planificador" aria-label="Planificador por ciclos">
          {sinMalla ? (
            <div className="empty-planner">
              <span className="empty-planner-icon"><FileSpreadsheet size={27} /></span>
              <h1>Tu malla comienza aquí</h1>
              <p>Sube tu plan de estudios en Excel para ver tus cursos y organizar los próximos ciclos.</p>
              <FileUpload />
            </div>
          ) : <>
          <div className="planner-heading"><div><span className="planner-section-title">Planificación regular y verano</span><h1>Malla proyectada</h1>
            <p>Los ciclos hasta el actual están bloqueados. Arrastra cursos pendientes a periodos futuros o selecciónalos por toque.</p></div></div>
          <div id="malla-container">
            {ciclos.map((numero) => {
              const cursosVerano = cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'VERANO' && curso.ciclo === numero);
              return <Fragment key={numero}>
                {!ciclosExcluidos.includes(numero) && <CicloRow numCiclo={numero} cursos={cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === numero)} />}
                {(!ciclosExcluidos.includes(numero) || cursosVerano.length > 0) && periodoIngreso && (permiteVeranoDespuesDe(numero, periodoIngreso) || cursosVerano.length > 0) && (mostrarVeranos || cursosVerano.length > 0) &&
                  <CicloRow numCiclo={numero} tipoPeriodo="VERANO" cursos={cursosVerano} habilitado={permiteVeranoDespuesDe(numero, periodoIngreso)} />}
              </Fragment>;
            })}
            {siguienteCiclo !== null && <button type="button" className="add-cycle-btn" onClick={() => void agregarCiclo()}><Plus size={15} /> Añadir ciclo {siguienteCiclo}</button>}
          </div>
          </>}
        </section>
      </main>

      <PlanificadorPanel /><PrerequisitoToast />
      {cursoAMover && <div className="tap-move-floating-bar" role="status"><span>Moviendo {cursos.find((curso) => curso.codigo === cursoAMover)?.nombre}</span><button type="button" onClick={() => setCursoAMover(null)}><X size={14} /> Cancelar</button></div>}
      {errorExportar && <div className="integration-error" role="alert">{errorExportar}</div>}
      {mostrarConfiguracion && <BienvenidaModal onClose={() => setModalContexto(false)} />}
      {mostrarAyuda && <AyudaModal obligatorio={mostrarTutorialInicial}
        onClose={() => setModalAyuda(false)}
        onFinish={mostrarTutorialInicial ? finalizarTutorialInicial : undefined} />}
      {modalCarga && <div className="upload-modal-backdrop" role="presentation" onMouseDown={() => setModalCarga(false)}><div className="upload-modal" role="dialog" aria-modal="true" aria-label="Cargar malla" onMouseDown={(event) => event.stopPropagation()}><div className="upload-modal-head"><h2>Actualizar plan de estudios</h2><button type="button" onClick={() => setModalCarga(false)} aria-label="Cerrar"><X size={18} /></button></div><p>Al cargar una malla nueva se reinicia la planificación manual.</p><FileUpload onSuccess={() => setModalCarga(false)} /></div></div>}
    </div>
  );
}
