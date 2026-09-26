import { Calculator, FileSpreadsheet, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { FileUpload } from './FileUpLoad';
import { BackupControls } from './BackupControls';
import { useAcademicStore } from '../store/useAcademicStore';
import type { Curso } from '../types/academic';
import mallaDemo from '../data/universidades/pe-utp/malla-software-2026.json';
import hero from '../assets/hero.png';

export function Homepage() {
  const setCursos = useAcademicStore((state) => state.setCursos);
  return (
    <div className="homepage-container">
      <header className="homepage-header"><span className="homepage-brand"><span className="brand-logo-icon"><GraduationCap size={19} /></span><b className="brand-title">MallaU</b><span className="topbar-badge">Academic Planner</span></span></header>
      <main className="homepage-main">
        <section className="homepage-hero">
          <div className="hero-content"><span className="hero-pill"><Sparkles size={14} /> Planificación curricular y financiera</span>
            <h1 className="hero-title">Proyecta tu avance académico <span className="hero-title-gradient">antes de matricularte</span></h1>
            <p className="hero-subtitle">Organiza tus ciclos, revisa prerrequisitos, planifica veranos y estima tus costos con los datos de tu malla.</p>
          </div>
          <div className="hero-graphic"><img className="hero-img" src={hero} alt="Ilustración de planificación académica" /></div>
        </section>
        <section className="homepage-upload" aria-label="Cargar malla"><FileUpload />
          <button type="button" className="demo-button" onClick={() => void setCursos(mallaDemo.cursos as unknown as Curso[], 'Malla de demostración 2026')}>
            Probar con la malla de demostración
          </button>
          <div className="homepage-backup"><BackupControls /></div>
        </section>
        <section className="features-preview-grid" aria-label="Funciones">
          <div className="feature-preview-card"><ShieldCheck size={20} /><div><h3>Prerrequisitos</h3><p>Comprueba la secuencia académica antes de mover cursos.</p></div></div>
          <div className="feature-preview-card"><Sparkles size={20} /><div><h3>Ruta académica</h3><p>Examina una propuesta antes de aplicarla.</p></div></div>
          <div className="feature-preview-card"><Calculator size={20} /><div><h3>Cuotas y costos</h3><p>Consulta estimaciones según la configuración vigente.</p></div></div>
          <div className="feature-preview-card"><FileSpreadsheet size={20} /><div><h3>Tu propio avance</h3><p>Importa tu Excel y conserva tu planificación localmente.</p></div></div>
        </section>
      </main>
    </div>
  );
}
