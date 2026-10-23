import { useEffect, type Ref } from 'react';
import { Bot, X } from 'lucide-react';

export const DURACION_SALUDO_MS = 8000;

interface SaludoProps {
  onCerrar: () => void;
}

/** Burbuja de bienvenida junto al botón; se cierra con X o sola a los 8 s. */
export function AsistenteSaludo({ onCerrar }: SaludoProps) {
  useEffect(() => {
    const temporizador = window.setTimeout(onCerrar, DURACION_SALUDO_MS);
    return () => window.clearTimeout(temporizador);
  }, [onCerrar]);

  return <div className="ia-saludo" role="status">
    <span>¡Hola! ¿Te ayudo a planificar tu matrícula?</span>
    <button type="button" className="ia-saludo-cerrar" onClick={onCerrar} aria-label="Cerrar saludo"><X size={16} aria-hidden="true" /></button>
  </div>;
}

interface FabProps {
  oculto: boolean;
  mostrarSaludo: boolean;
  onAbrir: () => void;
  onCerrarSaludo: () => void;
  botonRef?: Ref<HTMLButtonElement>;
}

export function AsistenteFab({ oculto, mostrarSaludo, onAbrir, onCerrarSaludo, botonRef }: FabProps) {
  if (oculto) return null;
  return <div className="ia-fab-zona">
    {mostrarSaludo && <AsistenteSaludo onCerrar={onCerrarSaludo} />}
    <button ref={botonRef} type="button" className="ia-fab" onClick={onAbrir}
      aria-label="Abrir asistente académico IA" aria-haspopup="dialog" title="Asistente académico IA">
      <Bot size={26} aria-hidden="true" />
    </button>
  </div>;
}
