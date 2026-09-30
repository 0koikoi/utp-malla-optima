import { useRef } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { useExcelParser } from '@/hooks/useExcelParser';
import { FacultadDropdown, PagoDropdown } from '@/components/controls/FacultadDropdown';

import { RangoCiclos } from '@/components/controls/RangoCiclos';
import { VeranoToggle } from '@/components/controls/VeranoToggle';
import { FileSpreadsheet, Upload, X, Calendar, HelpCircle } from 'lucide-react';

export function ConfigSidebar() {
  const {
    configSidebarOpen,
    setConfigSidebarOpen,
    nombreArchivoCargado,
    periodoIngreso,
    setPeriodoIngreso,
    setBienvenidaModalOpen,
  } = usePlannerStore();
  const { parsearExcel } = useExcelParser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      parsearExcel(file);
    }
  }

  const fileName = nombreArchivoCargado ?? 'Sube tu malla .xlsx';
  const displayName = fileName.length > 25 ? fileName.slice(0, 23) + '…' : fileName;
  const isLoaded = !!nombreArchivoCargado;

  return (
    <>
      {/* Overlay oscuro para cerrar al hacer clic afuera */}
      {configSidebarOpen && (
        <div 
          className="config-sidebar-overlay" 
          onClick={() => setConfigSidebarOpen(false)}
        />
      )}
      
      <aside className={`config-sidebar ${configSidebarOpen ? 'open' : ''}`}>
        <div className="config-sidebar-header">
          <h2>Configuración</h2>
          <button className="close-btn" onClick={() => setConfigSidebarOpen(false)} title="Cerrar opciones">
            <X size={18} />
          </button>
        </div>

        <div className="config-sidebar-content">
          <div className="config-section">
            <label htmlFor="cfg-excel-upload" className="config-label">
              <FileSpreadsheet size={14} className="inline-icon" /> Archivo de Malla
            </label>
            <div className={`upload-wrap${isLoaded ? ' loaded' : ''}`} style={{ display: 'block', width: '100%' }}>
              <input
                ref={fileInputRef}
                type="file"
                id="cfg-excel-upload"
                aria-label="Subir archivo de malla Excel"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              <div className="upload-face" style={{ justifyContent: 'center' }}>
                <Upload size={14} className="upload-icon" />
                <span>{displayName}</span>
              </div>
            </div>
          </div>

          <div className="config-divider" />
          
          {/* Selector de Periodo de Inicio (Marzo / Agosto) */}
          <div className="config-section">
            <label className="config-label">
              <Calendar size={14} className="inline-icon" /> Inicio de Carrera
            </label>
            <div className="periodo-toggle-group">
              <button
                type="button"
                className={`periodo-toggle-btn ${periodoIngreso === 'marzo' ? 'active' : ''}`}
                onClick={() => setPeriodoIngreso('marzo')}
              >
                Inicio en Marzo
              </button>
              <button
                type="button"
                className={`periodo-toggle-btn ${periodoIngreso === 'agosto' ? 'active' : ''}`}
                onClick={() => setPeriodoIngreso('agosto')}
              >
                Inicio en Agosto
              </button>
            </div>
            <span className="config-hint">
              {periodoIngreso === 'marzo'
                ? 'Veranos en Enero tras ciclos regulares pares (Ciclo 2, 4, 6...)'
                : 'Veranos en Enero tras ciclos regulares impares (Ciclo 1, 3, 5...)'}
            </span>
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <FacultadDropdown idPrefix="cfg-" />
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <PagoDropdown idPrefix="cfg-pago-" />
          </div>


          <div className="config-divider" />
          
          <div className="config-section">
            <RangoCiclos idPrefix="cfg-" />
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <VeranoToggle idPrefix="cfg-" />
          </div>

          <div className="config-divider" />

          <div className="config-section" style={{ marginTop: 'auto', paddingTop: '8px' }}>
            <button
              type="button"
              className="cfg-btn-instructivo"
              onClick={() => {
                setConfigSidebarOpen(false);
                setBienvenidaModalOpen(true);
              }}
            >
              <HelpCircle size={15} /> Ver Instructivo y Guía
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

