import { useEffect } from 'react';
import { AlertTriangle, Clock3, Gauge, LockKeyhole, X } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';

export function PrerequisitoToast() {
  const { notificacionMovimiento, limpiarNotificacionMovimiento } = useAcademicStore();

  useEffect(() => {
    if (!notificacionMovimiento) return;
    const timer = window.setTimeout(limpiarNotificacionMovimiento, 5500);
    return () => window.clearTimeout(timer);
  }, [notificacionMovimiento, limpiarNotificacionMovimiento]);

  if (!notificacionMovimiento) return null;

  const { tipo } = notificacionMovimiento;
  const faltantes = notificacionMovimiento.faltantes ?? [];
  const titulo =
    tipo === 'INMOVIBLE'
      ? 'Curso bloqueado'
      : tipo === 'PRERREQUISITOS'
        ? 'Prerrequisitos pendientes'
        : tipo === 'PERIODO_ANTERIOR' || tipo === 'PERIODO_ACTUAL'
          ? 'Periodo no disponible'
          : tipo === 'LIMITE_CREDITOS_VERANO'
            ? 'Límite de verano'
            : 'Límite de horas';

  const Icono =
    tipo === 'INMOVIBLE'
      ? LockKeyhole
      : tipo === 'PERIODO_ANTERIOR' || tipo === 'PERIODO_ACTUAL'
        ? Clock3
        : tipo === 'LIMITE_CREDITOS_VERANO' || tipo === 'LIMITE_HORAS'
          ? Gauge
          : AlertTriangle;

  return (
    <div className="planner-toast" role="alert" aria-live="assertive">
      <div className="planner-toast-head">
        <Icono size={17} />
        <strong>{titulo}</strong>
        <button
          type="button"
          className="planner-toast-close"
          onClick={limpiarNotificacionMovimiento}
          aria-label="Cerrar advertencia"
        >
          <X size={16} />
        </button>
      </div>

      {tipo === 'INMOVIBLE' ? (
        <p>
          <b>{notificacionMovimiento.cursoNombre}</b> ya figura como aprobado, convalidado o en curso y no puede cambiarse de periodo.
        </p>
      ) : tipo === 'PRERREQUISITOS' ? (
        <>
          <p>
            Para mover <b>{notificacionMovimiento.cursoNombre}</b> a {notificacionMovimiento.periodoDestino ?? 'ese periodo'}, primero debes aprobar o planificar antes:
          </p>
          <ul>
            {faltantes.map((faltante) => (
              <li key={faltante.codigo}>
                <span>{faltante.codigo}</span>
                <strong>{faltante.nombre}</strong>
              </li>
            ))}
          </ul>
          <small>Los prerrequisitos deben estar en un periodo cronológicamente anterior.</small>
        </>
      ) : (
        <p>
          <b>{notificacionMovimiento.cursoNombre}</b>: {notificacionMovimiento.mensaje}
        </p>
      )}
    </div>
  );
}
