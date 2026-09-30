import { useState } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { CalendarRange } from 'lucide-react';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

interface RangoCiclosProps {
  idPrefix?: string;
}

export function RangoCiclos({ idPrefix = '' }: RangoCiclosProps) {
  const { cursos, cicloInicio, cicloFin, setCicloInicio, setCicloFin } = usePlannerStore();

  const inicioId = `${idPrefix}sim-inicio`;
  const finId = `${idPrefix}sim-fin`;

  const maxCicloMalla = Object.values(cursos).length > 0 
    ? Math.max(...Object.values(cursos).map(c => c.cicloOrigen))
    : 12;
  
  // Mantenemos un mínimo absoluto de 12 para planes regulares y largos
  const maxAllowable = Math.max(12, maxCicloMalla);

  const [valInicio, setValInicio] = useState(String(cicloInicio));
  const [valFin, setValFin] = useState(String(cicloFin));
  const [prevInicio, setPrevInicio] = useState(cicloInicio);
  const [prevFin, setPrevFin] = useState(cicloFin);

  if (cicloInicio !== prevInicio) {
    setPrevInicio(cicloInicio);
    setValInicio(String(cicloInicio));
  }
  if (cicloFin !== prevFin) {
    setPrevFin(cicloFin);
    setValFin(String(cicloFin));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Bloquear signos negativos, positivos, decimales y notación exponencial
    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
      e.preventDefault();
    }
  }

  function handleInicioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      setValInicio('');
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      setValInicio(String(num));
    }
  }

  function handleInicioBlur() {
    let num = parseInt(valInicio, 10);
    if (isNaN(num)) {
      num = cicloInicio;
    }
    const clamped = clamp(num, 1, maxAllowable);
    setValInicio(String(clamped));
    setCicloInicio(clamped);

    // Ajuste automático si inicio supera fin
    if (clamped > cicloFin) {
      setCicloFin(clamped);
      setValFin(String(clamped));
    }
  }

  function handleFinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      setValFin('');
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      setValFin(String(num));
    }
  }

  function handleFinBlur() {
    let num = parseInt(valFin, 10);
    if (isNaN(num)) {
      num = cicloFin;
    }
    const clamped = clamp(num, 1, maxAllowable);
    setValFin(String(clamped));
    setCicloFin(clamped);

    // Ajuste automático si fin es menor que inicio
    if (clamped < cicloInicio) {
      setCicloInicio(clamped);
      setValInicio(String(clamped));
    }
  }

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <CalendarRange size={12} className="inline-icon" /> Ciclos (Regular)
      </span>
      <div className="nav-group-body ciclo-inputs">
        <label htmlFor={inicioId} className="lbl">Del</label>
        <input
          type="number"
          className="ciclo-num"
          id={inicioId}
          aria-label="Ciclo de inicio"
          value={valInicio}
          min={1}
          max={maxAllowable}
          title={`Ciclo de inicio (1 a ${maxAllowable})`}
          onKeyDown={handleKeyDown}
          onChange={handleInicioChange}
          onBlur={handleInicioBlur}
        />
        <span className="sep" aria-hidden="true">—</span>
        <label htmlFor={finId} className="visually-hidden" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
          Ciclo de fin
        </label>
        <input
          type="number"
          className="ciclo-num"
          id={finId}
          aria-label="Ciclo de fin"
          value={valFin}
          min={1}
          max={maxAllowable}
          title={`Ciclo de fin (1 a ${maxAllowable})`}
          onKeyDown={handleKeyDown}
          onChange={handleFinChange}
          onBlur={handleFinBlur}
        />
        <span className="lbl">de {maxAllowable}</span>
      </div>
    </div>
  );
}
