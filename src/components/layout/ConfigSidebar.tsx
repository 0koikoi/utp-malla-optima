import { useRef } from 'react';
import { useMallaStore } from '@/store/mallaStore';
import { useExcelParser } from '@/hooks/useExcelParser';
import { FacultadDropdown } from '@/components/controls/FacultadDropdown';
import { PagoDropdown } from '@/components/controls/PagoDropdown';
import { RangoCiclos } from '@/components/controls/RangoCiclos';
import { VeranoToggle } from '@/components/controls/VeranoToggle';
import { FileSpreadsheet, Upload, X } from 'lucide-react';

export function ConfigSidebar() {
  const { configSidebarOpen, setConfigSidebarOpen, nombreArchivoCargado } = useMallaStore();
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
            <label className="config-label"><FileSpreadsheet size={14} className="inline-icon" /> Archivo de Malla</label>
            <div className={`upload-wrap${isLoaded ? ' loaded' : ''}`} id="upload-wrap" style={{ display: 'block', width: '100%' }}>
              <input
                ref={fileInputRef}
                type="file"
                id="excel-upload"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              <div className="upload-face" style={{ justifyContent: 'center' }}>
                <Upload size={14} className="upload-icon" />
                <span id="upload-text">{displayName}</span>
              </div>
            </div>
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <FacultadDropdown />
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <PagoDropdown />
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <RangoCiclos />
          </div>

          <div className="config-divider" />
          
          <div className="config-section">
            <VeranoToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
