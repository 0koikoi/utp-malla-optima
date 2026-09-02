import { useState, useEffect } from 'react';
import { useMallaStore } from '@/store/mallaStore';

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function RangoCiclos() {
  const { cicloInicio, cicloFin, setCicloInicio, setCicloFin } = useMallaStore();

  const [valInicio, setValInicio] = useState(String(cicloInicio));
  const [valFin, setValFin] = useState(String(cicloFin));

  useEffect(() => {
    setValInicio(String(cicloInicio));
  }, [cicloInicio]);

  useEffect(() => {
    setValFin(String(cicloFin));
  }, [cicloFin]);

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

    const clamped = clamp(num, 1, 12);
    setValInicio(String(clamped));
    setCicloInicio(clamped);
    if (clamped > cicloFin) {
      setCicloFin(clamped);
      setValFin(String(clamped));
    }
  }

  function handleInicioBlur() {
    if (valInicio === '' || isNaN(parseInt(valInicio, 10))) {
      const fallback = clamp(cicloInicio || 1, 1, 12);
      setValInicio(String(fallback));
      setCicloInicio(fallback);
    } else {
      const num = parseInt(valInicio, 10);
      const clamped = clamp(num, 1, 12);
      setValInicio(String(clamped));
      setCicloInicio(clamped);
      if (clamped > cicloFin) {
        setCicloFin(clamped);
        setValFin(String(clamped));
      }
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

    const clamped = clamp(num, 1, 12);
    setValFin(String(clamped));
    setCicloFin(clamped);
    if (clamped < cicloInicio) {
      setCicloInicio(clamped);
      setValInicio(String(clamped));
    }
  }

  function handleFinBlur() {
    if (valFin === '' || isNaN(parseInt(valFin, 10))) {
      const fallback = clamp(cicloFin || 12, cicloInicio, 12);
      setValFin(String(fallback));
      setCicloFin(fallback);
    } else {
      const num = parseInt(valFin, 10);
      const clamped = clamp(num, 1, 12);
      const finalFin = clamped < cicloInicio ? cicloInicio : clamped;
      setValFin(String(finalFin));
      setCicloFin(finalFin);
    }
  }

  return (
    <div className="nav-group">
      <span className="nav-group-label">
        <i className="fas fa-calendar-alt" /> Ciclos (Regular)
      </span>
      <div className="nav-group-body ciclo-inputs">
        <span className="lbl">Del</span>
        <input
          type="number"
          className="ciclo-num"
          id="sim-inicio"
          value={valInicio}
          min={1}
          max={12}
          title="Ciclo de inicio (1 a 12)"
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
          max={12}
          title="Ciclo de fin (1 a 12)"
          onKeyDown={handleKeyDown}
          onChange={handleFinChange}
          onBlur={handleFinBlur}
        />
        <span className="lbl">de 12</span>
      </div>
    </div>
  );
}
