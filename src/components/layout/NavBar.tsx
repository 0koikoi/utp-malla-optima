// NavBar.tsx — Barra de controles del simulador
// Incluye funciones de dev: Auto-Planificador óptimo, Respaldo/Restauración JSON, Exportación PNG/PDF
// Iconografía moderna con Lucide React

import { useRef, useState, useEffect } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { useCreditosElectivos } from '@/store/selectors';
import { useExport } from '@/hooks/useExport';
import { descargarRespaldoJSON, leerRespaldoJSON } from '@/services/backupService';
import {
  Sparkles,
  RotateCcw,
  Download,
  UploadCloud,
  CheckCircle2,
  Info,
  Settings2,
  Camera,
  FileDown,
  Database,
  HelpCircle,
} from 'lucide-react';



export function NavBar() {
  const {
    cursos,
    asignaciones,
    facultad,
    metodoPago,
    cicloInicio,
    cicloFin,
    veranoActivo,
    cantVeranos,
    veranoUbicaciones,
    nombreArchivoCargado,
    resetAsignaciones,
    cargarRespaldo,
    setConfigSidebarOpen,
    setBienvenidaModalOpen,
  } = usePlannerStore();

  const creditosElectivos = useCreditosElectivos();
  const { exportarPNG, exportarPDF, exportando } = useExport();

  const backupInputRef = useRef<HTMLInputElement>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'exito' | 'info' | 'error'; texto: string } | null>(null);
  const [menuAccionesOpen, setMenuAccionesOpen] = useState(false);
  const [menuExportOpen, setMenuExportOpen] = useState(false);

  const exportWrapRef = useRef<HTMLDivElement>(null);
  const accionesWrapRef = useRef<HTMLDivElement>(null);
  const exportTimerRef = useRef<number | null>(null);
  const accionesTimerRef = useRef<number | null>(null);

  // Cerrar menús desplegables al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportWrapRef.current &&
        !exportWrapRef.current.contains(e.target as Node)
      ) {
        setMenuExportOpen(false);
      }
      if (
        accionesWrapRef.current &&
        !accionesWrapRef.current.contains(e.target as Node)
      ) {
        setMenuAccionesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejadores de vistazo (hover preview) con margen de transición
  function handleExportMouseEnter() {
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    setMenuExportOpen(true);
    setMenuAccionesOpen(false);
  }

  function handleExportMouseLeave() {
    exportTimerRef.current = window.setTimeout(() => {
      setMenuExportOpen(false);
    }, 160);
  }

  function handleAccionesMouseEnter() {
    if (accionesTimerRef.current) clearTimeout(accionesTimerRef.current);
    setMenuAccionesOpen(true);
    setMenuExportOpen(false);
  }

  function handleAccionesMouseLeave() {
    accionesTimerRef.current = window.setTimeout(() => {
      setMenuAccionesOpen(false);
    }, 160);
  }

  function mostrarFeedback(texto: string, tipo: 'exito' | 'info' | 'error' = 'exito') {
    setFeedbackMsg({ tipo, texto });
    setTimeout(() => setFeedbackMsg(null), 4500);
  }

  function handleExportarJSON() {
    if (Object.keys(cursos).length === 0) {
      mostrarFeedback('No hay cursos para respaldar.', 'info');
      return;
    }
    descargarRespaldoJSON({
      nombreArchivoCargado,
      facultad,
      metodoPago,
      cicloInicio,
      cicloFin,
      veranoActivo,
      cantVeranos,
      veranoUbicaciones,
      cursos,
      asignaciones,
    });
    mostrarFeedback('Respaldo de planificación descargado en JSON.', 'exito');
    setMenuAccionesOpen(false);
  }

  async function handleImportarJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const respaldo = await leerRespaldoJSON(file);
      cargarRespaldo(respaldo);
      mostrarFeedback('¡Planificación restaurada con éxito desde el archivo JSON!', 'exito');
    } catch (err) {
      mostrarFeedback(err instanceof Error ? err.message : 'Error al cargar respaldo', 'error');
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
      setMenuAccionesOpen(false);
    }
  }

  return (
    <>
      <nav id="app-nav" aria-label="Controles del simulador">
        {/* 1. Créditos Electivos */}
        <div className="nav-group" title="Créditos electivos mínimos requeridos: 3 crd">
          <span className="nav-group-label">Electivos</span>
          <div className="nav-group-body">
            <span className={`nav-chip-electivos ${creditosElectivos >= 3 ? 'cumplido' : 'pendiente'}`}>
              {creditosElectivos >= 3 ? (
                <CheckCircle2 size={12} className="chip-status-icon" />
              ) : (
                <Info size={12} className="chip-status-icon" />
              )}
              {creditosElectivos} / 3 crd
            </span>
          </div>
        </div>

        <div className="nav-divider" />

        {/* 2. Clúster de acciones rápidas */}
        <div className="nav-actions-cluster">
          {/* Botón Estrategia de Matrícula (Asesor Curricular IA & Presupuesto) */}
          <button
            type="button"
            className="nav-btn nav-btn-strategy"
            id="btn-strategy-panel"
            title="Estrategia de Matrícula: Asesor Curricular (IA) y Simulación Financiera"
            onClick={() => {
              if (Object.keys(cursos).length === 0) {
                mostrarFeedback('Primero debes cargar tu malla para acceder a la estrategia y finanzas.', 'info');
                return;
              }
              
              usePlannerStore.getState().abrirEstrategia('academico');
            }}
            aria-label="Estrategia de Matrícula: Asesor Curricular y Finanzas"
          >
            <Sparkles size={16} className="btn-icon-sparkle" />
          </button>

          {/* Botón de Captura (Exportar PNG / PDF) con vistazo */}
          <div
            ref={exportWrapRef}
            className="nav-dropdown-wrap"
            onMouseEnter={handleExportMouseEnter}
            onMouseLeave={handleExportMouseLeave}
          >
            <button
              type="button"
              className={`nav-btn nav-btn-export ${menuExportOpen ? 'active' : ''}`}
              id="btn-export-menu"
              aria-label="Captura y exportación"
              title="Captura rápida PNG (clic) / Opciones PDF (hover)"
              onClick={async () => {
                if (Object.keys(cursos).length === 0) {
                  mostrarFeedback('Primero debes cargar tu malla para exportar.', 'info');
                  return;
                }
                setMenuExportOpen(false);
                mostrarFeedback('Generando captura en alta resolución...', 'info');
                const ok = await exportarPNG();
                if (ok) {
                  mostrarFeedback('¡Captura PNG descargada con éxito!', 'exito');
                } else {
                  mostrarFeedback('No se pudo generar la captura. Reintenta.', 'error');
                }
              }}
              disabled={exportando}
            >
              <Camera size={16} />
            </button>
            {menuExportOpen && (
              <div className="nav-sub-menu" role="menu">
                <div className="nav-sub-header">Captura & Exportación</div>
                <button
                  type="button"
                  className="nav-sub-item"
                  role="menuitem"
                  onClick={async () => {
                    setMenuExportOpen(false);
                    if (Object.keys(cursos).length === 0) {
                      mostrarFeedback('Primero debes cargar tu malla para exportar.', 'info');
                      return;
                    }
                    mostrarFeedback('Generando imagen PNG...', 'info');
                    const ok = await exportarPNG();
                    if (ok) {
                      mostrarFeedback('¡Imagen PNG descargada con éxito!', 'exito');
                    } else {
                      mostrarFeedback('Error al exportar PNG. Reintenta.', 'error');
                    }
                  }}
                >
                  <Camera size={14} className="sub-item-icon" />
                  <div className="sub-item-content">
                    <span className="sub-item-title">Imagen PNG</span>
                    <span className="sub-item-desc">Malla completa en alta resolución</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="nav-sub-item"
                  role="menuitem"
                  onClick={async () => {
                    setMenuExportOpen(false);
                    if (Object.keys(cursos).length === 0) {
                      mostrarFeedback('Primero debes cargar tu malla para exportar.', 'info');
                      return;
                    }
                    mostrarFeedback('Generando documento PDF...', 'info');
                    const ok = await exportarPDF();
                    if (ok) {
                      mostrarFeedback('¡Documento PDF descargado con éxito!', 'exito');
                    } else {
                      mostrarFeedback('Error al exportar PDF. Reintenta.', 'error');
                    }
                  }}
                >
                  <FileDown size={14} className="sub-item-icon" />
                  <div className="sub-item-content">
                    <span className="sub-item-title">Documento PDF</span>
                    <span className="sub-item-desc">Listo para imprimir o archivar</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Botón de Gestión (Respaldos JSON y Limpieza) con vistazo */}
          <div
            ref={accionesWrapRef}
            className="nav-dropdown-wrap"
            onMouseEnter={handleAccionesMouseEnter}
            onMouseLeave={handleAccionesMouseLeave}
          >
            <button
              type="button"
              className={`nav-btn nav-btn-more ${menuAccionesOpen ? 'active' : ''}`}
              id="btn-mas-acciones"
              aria-label="Gestión de datos y respaldos"
              title="Gestión de datos (Respaldos JSON y Limpieza)"
              onClick={() => {
                setMenuAccionesOpen((v) => !v);
                setMenuExportOpen(false);
              }}
            >
              <Database size={16} />
            </button>
            {menuAccionesOpen && (
              <div className="nav-sub-menu" role="menu">
                <div className="nav-sub-header">Gestión de Planificación</div>
                <button
                  type="button"
                  className="nav-sub-item"
                  role="menuitem"
                  onClick={handleExportarJSON}
                >
                  <Download size={14} className="sub-item-icon" />
                  <div className="sub-item-content">
                    <span className="sub-item-title">Descargar Respaldo JSON</span>
                    <span className="sub-item-desc">Guarda tu avance actual</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="nav-sub-item"
                  role="menuitem"
                  onClick={() => backupInputRef.current?.click()}
                >
                  <UploadCloud size={14} className="sub-item-icon" />
                  <div className="sub-item-content">
                    <span className="sub-item-title">Restaurar Respaldo JSON</span>
                    <span className="sub-item-desc">Carga tu avance guardado</span>
                  </div>
                </button>
                <div className="sub-divider" />
                <button
                  type="button"
                  className="nav-sub-item sub-danger"
                  role="menuitem"
                  onClick={() => {
                    resetAsignaciones();
                    setMenuAccionesOpen(false);
                    mostrarFeedback('Cursos devueltos a la lista de pendientes.', 'info');
                  }}
                >
                  <RotateCcw size={14} className="sub-item-icon" />
                  <div className="sub-item-content">
                    <span className="sub-item-title">Limpiar Planificación</span>
                    <span className="sub-item-desc">Devuelve cursos al banco</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Input oculto para restaurar respaldo JSON */}
          <input
            ref={backupInputRef}
            type="file"
            id="nav-backup-input"
            aria-label="Restaurar copia de respaldo JSON"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportarJSON}
          />

          <div className="nav-divider" style={{ margin: '0 2px' }} />

          {/* Botón de Configuración Sidebar */}
          <button
            type="button"
            className="nav-btn nav-btn-config"
            onClick={() => setConfigSidebarOpen(true)}
            title="Configuración General de la Malla (Facultad, Veranos, Pagos)"
            aria-label="Configuración"
          >
            <Settings2 size={16} />
          </button>

          {/* Botón de Instructivo y Periodo de Inicio */}
          <button
            type="button"
            className="nav-btn nav-btn-help"
            onClick={() => setBienvenidaModalOpen(true)}
            title="Instructivo y Periodo de Inicio (Marzo / Agosto)"
            aria-label="Instructivo y Periodo de Inicio"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        {/* Sección vacía reservada donde estaba el precio */}
        <div className="nav-slot-empty" id="nav-slot-custom" aria-hidden="true" />
      </nav>

      {/* Banner de feedback interactivo flotante */}
      {feedbackMsg && (
        <div className={`nav-feedback-toast toast-${feedbackMsg.tipo}`} role="status">
          {feedbackMsg.tipo === 'exito' && <CheckCircle2 size={15} />}
          {feedbackMsg.tipo === 'info' && <Info size={15} />}
          {feedbackMsg.tipo === 'error' && <RotateCcw size={15} />}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}
    </>
  );
}
