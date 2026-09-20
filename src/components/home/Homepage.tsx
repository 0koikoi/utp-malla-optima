// Homepage.tsx — Pantalla de inicio y bienvenida con zona de subida directa y Lucide Icons
import { useState, useRef } from 'react';
import { useExcelParser } from '@/hooks/useExcelParser';
import heroImg from '@/assets/hero.png';
import {
  GraduationCap,
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Info,
} from 'lucide-react';

export function Homepage() {
  const { parsearExcel } = useExcelParser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('Por favor sube un archivo Excel válido (.xlsx o .xls)');
      return;
    }
    setErrorMessage(null);
    try {
      parsearExcel(file);
    } catch {
      setErrorMessage('Ocurrió un error al procesar el archivo. Asegúrate de que sea tu Plan de Estudios UTP.');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="homepage-container">
      {/* Top Header simple */}
      <header className="homepage-header">
        <div className="homepage-brand">
          <span className="brand-logo-icon"><GraduationCap size={18} /></span>
          <span className="brand-title">UTP Malla Óptima</span>
          <span className="topbar-badge">Simulador 2026</span>
        </div>
      </header>

      <main className="homepage-main">
        {/* Sección Hero */}
        <section className="homepage-hero">
          <div className="hero-content">
            <span className="hero-pill">
              <Sparkles size={13} className="inline-icon" /> Planificador curricular & financiero
            </span>
            <h1 className="hero-title">
              Proyecta tu avance académico <br />
              <span className="hero-title-gradient">antes de matricularte</span>
            </h1>
            <p className="hero-subtitle">
              Sube tu plan de estudio de UTP+ para organizar tus ciclos, validar prerrequisitos en tiempo real, proyectar cursos de verano y estimar tus costos de pensión.
            </p>
          </div>

          <div className="hero-graphic">
            <img src={heroImg} alt="Ilustración de planificación académica" className="hero-img" />
          </div>
        </section>

        {/* Zona de Carga Directa */}
        <section className="homepage-upload-section">
          <div
            className={`upload-drop-card ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Subir archivo Excel de plan de estudios"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden-file-input"
              onChange={handleInputChange}
            />
            <div className="upload-icon-circle">
              <UploadCloud size={32} />
            </div>
            <h2 className="upload-card-title">Sube tu archivo de avance curricular</h2>
            <p className="upload-card-desc">
              Arrastra tu archivo <b>Plan_de_Estudio.xlsx</b> aquí o haz clic para buscarlo
            </p>
            <span className="upload-btn-fake">
              <FileSpreadsheet size={15} className="inline-icon" /> Seleccionar archivo Excel
            </span>
            <span className="upload-note">Soporta formatos oficiales .xlsx y .xls exportados de UTP+</span>
          </div>

          {errorMessage && (
            <div className="upload-error-alert" role="alert">
              <AlertCircle size={15} className="inline-icon" /> {errorMessage}
            </div>
          )}
        </section>

        {/* Guía en 3 Pasos */}
        <section className="homepage-steps-section">
          <h2 className="steps-heading">¿Cómo obtener tu archivo en 3 pasos?</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="step-card-content">
                <h3>Ingresa a UTP+ Portal</h3>
                <p>Inicia sesión con tu cuenta institucional de la universidad y dirígete al menú de <b>Cursos</b>.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">2</div>
              <div className="step-card-content">
                <h3>Avance de Plan de Estudio</h3>
                <p>Selecciona <b>Avance de plan de estudio</b> y presiona el botón <b>Avance por cursos</b> para visualizar tu malla.</p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num">3</div>
              <div className="step-card-content">
                <h3>Descarga y Proyecta</h3>
                <p>Haz clic en el botón de descarga para obtener tu <b>Plan_de_Estudio.xlsx</b> y súbelo aquí arriba.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Aviso referencial */}
        <footer className="homepage-footer">
          <p>
            <Info size={14} className="inline-icon" /> <b>Aviso:</b> Esta es una herramienta offline-first con fines de simulación referencial. No está enlazada al sistema oficial de matrícula UTP ni reserva cupos.
          </p>
        </footer>
      </main>
    </div>
  );
}
