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
  ShieldCheck,
  Calculator,
  CalendarRange,
} from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';
import mallaSoftwareDemo from '@/data/universidades/pe-utp/malla-software-2026.json';

export function Homepage() {
  const { parsearExcel, cargando, error: parserError } = useExcelParser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('Por favor sube un archivo Excel válido (.xlsx o .xls)');
      return;
    }
    setErrorMessage(null);
    const ok = await parsearExcel(file);
    if (!ok) {
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

  function handleCargarDemo() {
    const cursosMap: Record<string, any> = {};
    mallaSoftwareDemo.cursos.forEach((c) => {
      cursosMap[c.codigo] = {
        codigo: c.codigo,
        nombre: c.nombre,
        horasSemanales: c.horasSemanales,
        creditos: c.creditos,
        tipo: c.tipo === 'ELECTIVO' ? 'ELECTIVO' as const : 'OBLIGATORIO' as const,
        estado: c.estado,
        prerequisitos: (c as any).prerequisitos ?? (c as any).prerrequisitos ?? [],
        habilitaA: [],
        cicloOrigen: c.cicloOrigen,
      };
    });

    // Segunda pasada: poblar relaciones inversas (habilitaA)
    Object.values(cursosMap).forEach((c: any) => {
      (c.prerequisitos || []).forEach((codigoPre: string) => {
        if (cursosMap[codigoPre] && !cursosMap[codigoPre].habilitaA.includes(c.nombre)) {
          cursosMap[codigoPre].habilitaA.push(c.nombre);
        }
      });
    });

    usePlannerStore.getState().setCursos(cursosMap, 'Malla_Software_2026_Demo.xlsx');
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

        {/* Preview de Funcionalidades */}
        <section className="homepage-features-preview" aria-label="Características destacadas">
          <div className="features-preview-grid">
            <div className="feature-preview-card">
              <div className="feature-icon-box">
                <ShieldCheck size={18} />
              </div>
              <div className="feature-info">
                <h4>Validación de Prerrequisitos</h4>
                <p>Detecta secuencias inválidas y bloqueos topológicos en tiempo real al mover cursos.</p>
              </div>
            </div>

            <div className="feature-preview-card">
              <div className="feature-icon-box">
                <Sparkles size={18} />
              </div>
              <div className="feature-info">
                <h4>Auto-Planificación Óptima</h4>
                <p>Calcula automáticamente la ruta crítica nivelada para maximizar avance por ciclo.</p>
              </div>
            </div>

            <div className="feature-preview-card">
              <div className="feature-icon-box">
                <Calculator size={18} />
              </div>
              <div className="feature-info">
                <h4>Costos & Cuotas UTP 2026</h4>
                <p>Estima horas semanales, tramos de pensión y presupuesto exacto por periodo.</p>
              </div>
            </div>

            <div className="feature-preview-card">
              <div className="feature-icon-box">
                <CalendarRange size={18} />
              </div>
              <div className="feature-info">
                <h4>Proyección de Veranos</h4>
                <p>Simula cursos de nivelación en enero para adelantar asignaturas clave.</p>
              </div>
            </div>
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
              id="home-excel-upload"
              aria-label="Subir archivo Excel de plan de estudios"
              accept=".xlsx,.xls"
              className="hidden-file-input"
              onChange={handleInputChange}
            />
            <div className="upload-icon-circle">
              <UploadCloud size={32} />
            </div>
            <h2 className="upload-card-title">
              {cargando ? 'Procesando malla curricular...' : 'Sube tu archivo de avance curricular'}
            </h2>
            <p className="upload-card-desc">
              {cargando
                ? 'Analizando cursos, prerrequisitos y créditos de tu archivo UTP+...'
                : <>Arrastra tu archivo <b>Plan_de_Estudio.xlsx</b> aquí o haz clic para buscarlo</>}
            </p>
            <span className="upload-btn-fake">
              <FileSpreadsheet size={15} className="inline-icon" /> {cargando ? 'Cargando datos...' : 'Seleccionar archivo Excel'}
            </span>
            <span className="upload-note">Soporta formatos oficiales .xlsx y .xls exportados de UTP+</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              className="demo-load-btn"
              onClick={handleCargarDemo}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                padding: '9px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                transition: '0.15s ease',
              }}
            >
              <Sparkles size={14} style={{ color: '#ef233c' }} />
              ¿No tienes tu Excel a mano? Probar con Malla Demo (Ing. de Software 2026)
            </button>
          </div>

          {(errorMessage || parserError) && (
            <div className="upload-error-alert" role="alert">
              <AlertCircle size={15} className="inline-icon" /> {errorMessage || parserError}
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
