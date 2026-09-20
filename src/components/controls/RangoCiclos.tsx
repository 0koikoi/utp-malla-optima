import { useState } from 'react';
import { useMallaStore } from '@/store/mallaStore';
import { CalendarRange } from 'lucide-react';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function RangoCiclos() {
  const { cursos, cicloInicio, cicloFin, setCicloInicio, setCicloFin } = useMallaStore();

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
    if (isNaN(num)) return;

    const clamped = clamp(num, 1, maxAllowable);
    setValInicio(String(clamped));
    setCicloInicio(clamped);
    if (clamped > cicloFin) {
      setCicloFin(clamped);
      setValFin(String(clamped));
    }
  }

  function handleInicioBlur() {
    if (valInicio === '') {
      setValInicio(String(prevInicio));
    }
  }

  function handleFinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      setValFin('');
      return;
    }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;

    const clamped = clamp(num, 1, maxAllowable);
    setValFin(String(clamped));
    setCicloFin(clamped);
    if (clamped < cicloInicio) {
      setCicloInicio(clamped);
      setValInicio(String(clamped));
    }
  }

  function handleFinBlur() {
    if (valFin === '') {
      setValFin(String(prevFin));
    }
  }

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <CalendarRange size={12} className="inline-icon" /> Ciclos (Regular)
      </span>
      <div className="nav-group-body ciclo-inputs">
        <span className="lbl">Del</span>
        <input
          type="number"
          className="ciclo-num"
          id="sim-inicio"
          value={valInicio}
          min={1}
          max={maxAllowable}
          title={`Ciclo de inicio (1 a ${maxAllowable})`}
          onKeyDown={handleKeyDown}
          onChange={handleInicioChange}
          onBlur={handleInicioBlur}
        />
        <span className="sep">—</span>
        <input
          type="number"
          className="ciclo-num"
          id="sim-fin"
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
