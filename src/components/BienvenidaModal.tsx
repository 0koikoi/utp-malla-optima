import { useState } from 'react';
import { CalendarDays, GraduationCap, X } from 'lucide-react';
import type { PeriodoIngreso } from '../types/academic';
import { useAcademicStore } from '../store/useAcademicStore';

interface Props {
  onClose: () => void;
}

export function BienvenidaModal({ onClose }: Props) {
  const { periodoIngreso, cicloActual, setContextoAcademico } = useAcademicStore();
  const [ingreso, setIngreso] = useState<PeriodoIngreso | ''>(periodoIngreso ?? '');
  const [ciclo, setCiclo] = useState<number | ''>(cicloActual ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const completo = Boolean(periodoIngreso && cicloActual);

  const guardar = async () => {
    if (!ingreso || typeof ciclo !== 'number' || !Number.isInteger(ciclo) || ciclo < 1 || ciclo > 12) {
      setError('Selecciona el mes de inicio y un ciclo actual entre 1 y 12.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await setContextoAcademico(ingreso, ciclo);
      onClose();
    } catch {
      setError('No se pudo guardar tu contexto académico. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="context-backdrop" role="presentation">
      <section className="context-modal" role="dialog" aria-modal="true" aria-labelledby="context-title">
        <header className="context-modal-head">
          <div><span className="context-eyebrow"><GraduationCap size={14} /> Configuración académica</span>
            <h2 id="context-title">Bienvenido a MallaU</h2></div>
          {completo && <button type="button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>}
        </header>
        <div className="context-modal-body">
          <p>Cuéntanos cuándo iniciaste tu carrera y qué ciclo estás cursando. Así ubicaremos los veranos y tu avance académico.</p>
          <fieldset>
            <legend><CalendarDays size={15} /> ¿En qué mes iniciaste tu carrera?</legend>
            <div className="context-choice-row">
              <button type="button" className={ingreso === 'marzo' ? 'selected' : ''} onClick={() => setIngreso('marzo')}>Marzo <small>Veranos tras ciclos pares</small></button>
              <button type="button" className={ingreso === 'agosto' ? 'selected' : ''} onClick={() => setIngreso('agosto')}>Agosto <small>Veranos tras ciclos impares</small></button>
            </div>
          </fieldset>
          <label className="context-cycle-label" htmlFor="context-cycle">¿En qué ciclo te encuentras actualmente?</label>
          <select id="context-cycle" value={ciclo} onChange={(event) => setCiclo(event.target.value ? Number(event.target.value) : '')}>
            <option value="">Selecciona tu ciclo</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((numero) =>
              <option key={numero} value={numero}>Ciclo {numero}</option>)}
          </select>
          <p className="context-hint">El ciclo actual y los anteriores quedarán bloqueados. Podrás planificar desde el siguiente verano disponible o ciclo futuro.</p>
          {error && <p className="context-error" role="alert">{error}</p>}
          <button type="button" className="context-save" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar y comenzar'}
          </button>
        </div>
      </section>
    </div>
  );
}
