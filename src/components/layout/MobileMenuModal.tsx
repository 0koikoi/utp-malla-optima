// MobileMenuModal.tsx — Menú modal de controles y opciones para móvil (≤ 768px)
import { useRef } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { useCreditosElectivos } from '@/store/selectors';
import { useExcelParser } from '@/hooks/useExcelParser';
import { useExport } from '@/hooks/useExport';
import { descargarRespaldoJSON, leerRespaldoJSON } from '@/services/backupService';
import { FacultadDropdown } from '@/components/controls/FacultadDropdown';

import { RangoCiclos } from '@/components/controls/RangoCiclos';
import { VeranoToggle } from '@/components/controls/VeranoToggle';
import {
  SlidersHorizontal,
  FileSpreadsheet,
  Upload,
  Sparkles,
  RotateCcw,
  Camera,
  FileDown,
  Download,
  UploadCloud,
  CheckCircle2,
  Info,
  Award,
  X,
} from 'lucide-react';

export function MobileMenuModal() {
  const {
    menuMobOpen,
    setMenuMobOpen,
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
  } = usePlannerStore();

  const creditosElectivos = useCreditosElectivos();
  const { parsearExcel } = useExcelParser();
  const { exportarPNG, exportarPDF } = useExport();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!menuMobOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      parsearExcel(file);
      setMenuMobOpen(false);
    }
  }

  function handleExportarJSON() {
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
    setMenuMobOpen(false);
  }

  async function handleImportarJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const respaldo = await leerRespaldoJSON(file);
      cargarRespaldo(respaldo);
      setMenuMobOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al importar JSON');
    }
  }

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1060 }}
        onClick={() => setMenuMobOpen(false)}
      />
      <div className="mob-menu-sheet" role="dialog" aria-modal="true" aria-labelledby="mob-menu-title">
        <div className="mob-menu-head">
          <div className="mob-menu-head-title">
            <SlidersHorizontal size={15} />
            <span id="mob-menu-title">Opciones y Controles</span>
          </div>
          <button
            type="button"
            className="mob-menu-close"
            onClick={() => setMenuMobOpen(false)}
            aria-label="Cerrar opciones"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mob-menu-body">
          {/* 1. Subir/Cambiar archivo */}
          <div className="mob-menu-section">
            <span className="mob-section-label">
              <FileSpreadsheet size={13} className="inline-icon" /> Archivo de Malla
            </span>
            <div className="mob-upload-box" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                id="mob-excel-upload"
                aria-label="Subir plan de estudios Excel"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={14} />
              <span>{nombreArchivoCargado ?? 'Subir Plan_de_Estudio.xlsx'}</span>
            </div>
          </div>

          {/* 2. Estrategia & Finanzas (Asistente IA + Presupuesto) */}
          <div className="mob-menu-section">
            <button
              type="button"
              className="nav-btn nav-btn-strategy mob-full-btn"
              onClick={() => {
                setMenuMobOpen(false);
                if (Object.keys(cursos).length === 0) return;
                
                usePlannerStore.getState().abrirEstrategia('academico');
              }}
            >
              <Sparkles size={14} className="btn-icon-sparkle" />
              <span>Estrategia de Matrícula (IA & Cuotas)</span>
            </button>
          </div>

          {/* 3. Facultad */}
          <div className="mob-menu-section">
            <FacultadDropdown idPrefix="mob-" />
          </div>


          {/* 5. Rango de Ciclos */}
          <div className="mob-menu-section">
            <RangoCiclos idPrefix="mob-" />
          </div>

          {/* 6. Verano */}
          <div className="mob-menu-section">
            <VeranoToggle idPrefix="mob-" />
          </div>

          {/* 7. Electivos */}
          <div className="mob-menu-section">
            <span className="mob-section-label">
              <Award size={13} className="inline-icon" /> Avance de Electivos
            </span>
            <div className="mob-electivos-chip-wrap">
              <span className={`nav-chip-electivos ${creditosElectivos >= 3 ? 'cumplido' : 'pendiente'}`}>
                {creditosElectivos >= 3 ? <CheckCircle2 size={12} /> : <Info size={12} />}
                {' '}{creditosElectivos} / 3 créditos mínimos
              </span>
            </div>
          </div>

          {/* 8. Exportación y Respaldo */}
          <div className="mob-menu-section mob-actions-row">
            <button
              type="button"
              className="nav-btn nav-btn-export mob-full-btn"
              onClick={() => {
                exportarPNG();
                setMenuMobOpen(false);
              }}
            >
              <Camera size={13} /> Exportar PNG
            </button>
            <button
              type="button"
              className="nav-btn nav-btn-export mob-full-btn"
              onClick={() => {
                exportarPDF();
                setMenuMobOpen(false);
              }}
            >
              <FileDown size={13} /> Exportar PDF
            </button>
          </div>

          <div className="mob-menu-section mob-actions-row">
            <button
              type="button"
              className="nav-btn nav-btn-more mob-full-btn"
              onClick={handleExportarJSON}
            >
              <Download size={13} /> Guardar Respaldo (.json)
            </button>
            <button
              type="button"
              className="nav-btn nav-btn-more mob-full-btn"
              onClick={() => backupInputRef.current?.click()}
            >
              <UploadCloud size={13} /> Restaurar (.json)
            </button>
            <input
              ref={backupInputRef}
              type="file"
              id="mob-backup-input"
              aria-label="Restaurar copia de respaldo JSON"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportarJSON}
            />
          </div>

          {/* 9. Limpiar */}
          <div className="mob-menu-section">
            <button
              type="button"
              className="nav-btn nav-btn-reset mob-full-btn"
              onClick={() => {
                resetAsignaciones();
                setMenuMobOpen(false);
              }}
            >
              <RotateCcw size={13} /> Limpiar Planificación
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
