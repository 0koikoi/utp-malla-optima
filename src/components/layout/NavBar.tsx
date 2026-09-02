// NavBar — barra de controles del simulador
// Ensambla: upload, facultad, pago, ciclos, verano, acciones, costo global

import { useRef } from 'react';
import { useMallaStore } from '@/store/mallaStore';
import { useCuotaMaxima } from '@/store/selectors';
import { useExcelParser } from '@/hooks/useExcelParser';
import { useExport } from '@/hooks/useExport';
import { formatSoles } from '@/utils/finance';
import { FacultadDropdown } from '@/components/controls/FacultadDropdown';
import { PagoDropdown } from '@/components/controls/PagoDropdown';
import { RangoCiclos } from '@/components/controls/RangoCiclos';
import { VeranoToggle } from '@/components/controls/VeranoToggle';

export function NavBar() {
  const { nombreArchivoCargado, resetAsignaciones } = useMallaStore();
  const cuotaMax = useCuotaMaxima();
  const { parsearExcel } = useExcelParser();
  const { exportarPNG } = useExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parsearExcel(file);
  }

  const fileName = nombreArchivoCargado ?? 'Plan_de_Estudio.xlsx';
  const displayName = fileName.length > 22 ? fileName.slice(0, 20) + '…' : fileName;
  const isLoaded = !!nombreArchivoCargado;

  return (
    <nav id="app-nav" aria-label="Controles del simulador">

      {/* 1. Subir Malla */}
      <div className="nav-group">
        <span className="nav-group-label">
          <i className="fas fa-file-excel" /> Subir Malla
        </span>
        <div className="nav-group-body">
          <div className={`upload-wrap${isLoaded ? ' loaded' : ''}`} id="upload-wrap">
            <input
              ref={fileInputRef}
              type="file"
              id="excel-upload"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            <div className="upload-face">
              <i className="fas fa-upload" />
              <span id="upload-text">{displayName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-divider" />

      {/* 2. Facultad */}
      <FacultadDropdown />

      <div className="nav-divider" />

      {/* 3. Método de pago */}
      <PagoDropdown />

      <div className="nav-divider" />

      {/* 4. Rango de ciclos */}
      <RangoCiclos />

      <div className="nav-divider" />

      {/* 5. Verano */}
      <VeranoToggle />

      <div className="nav-divider" />

      {/* 6. Acciones */}
      <div className="nav-group">
        <span className="nav-group-label">
          <i className="fas fa-tools" /> Acciones
        </span>
        <div className="nav-group-body" style={{ gap: '6px' }}>
          <button
            className="nav-btn nav-btn-reset"
            id="btn-reset"
            title="Devolver cursos pendientes al pozo"
            onClick={resetAsignaciones}
          >
            <i className="fas fa-undo" /> Limpiar
          </button>
          <button
            className="nav-btn nav-btn-export"
            id="btn-export"
            title="Exportar planificador como imagen PNG"
            onClick={exportarPNG}
          >
            <i className="fas fa-camera" /> Exportar
          </button>
        </div>
      </div>

      {/* Costo global */}
      <div className="nav-cost">
        <span className="nav-cost-label">Cuota máxima</span>
        <span className="nav-cost-amount" id="costo-global">
          {formatSoles(cuotaMax)}
        </span>
        <span className="nav-cost-sub" id="cost-note">
          {cuotaMax > 0 ? 'Cuota más alta entre ciclos visibles' : 'Sin cursos asignados'}
        </span>
      </div>
    </nav>
  );
}
