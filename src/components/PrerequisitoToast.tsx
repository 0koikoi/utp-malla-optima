import { useEffect } from 'react';
import { AlertTriangle, LockKeyhole, X } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';

export function PrerequisitoToast() {
  const { notificacionMovimiento, limpiarNotificacionMovimiento } = useAcademicStore();

  useEffect(() => {
    if (!notificacionMovimiento) return;
    const timer = window.setTimeout(limpiarNotificacionMovimiento, 5500);
    return () => window.clearTimeout(timer);
  }, [notificacionMovimiento, limpiarNotificacionMovimiento]);

  if (!notificacionMovimiento) return null;

  const esInmovible = notificacionMovimiento.tipo === 'INMOVIBLE';
  const faltantes = notificacionMovimiento.faltantes ?? [];

  return (
    <div className="planner-toast" role="alert" aria-live="assertive">
      <div className="planner-toast-head">
        {esInmovible ? <LockKeyhole size={17} /> : <AlertTriangle size={17} />}
        <strong>{esInmovible ? 'Curso bloqueado' : 'Prerrequisitos pendientes'}</strong>
        <button
          type="button"
          className="planner-toast-close"
          onClick={limpiarNotificacionMovimiento}
          aria-label="Cerrar advertencia"
        >
          <X size={16} />
        </button>
      </div>

      {esInmovible ? (
        <p>
          <b>{notificacionMovimiento.cursoNombre}</b> ya figura como aprobado o convalidado y no puede cambiarse de ciclo.
        </p>
      ) : (
        <>
          <p>
            Para mover <b>{notificacionMovimiento.cursoNombre}</b> a ese ciclo, primero debes aprobar o planificar antes:
          </p>
          <ul>
            {faltantes.map((faltante) => (
              <li key={faltante.codigo}>
                <span>{faltante.codigo}</span>
                <strong>{faltante.nombre}</strong>
              </li>
            ))}
          </ul>
          <small>Coloca esos cursos en un ciclo anterior y vuelve a intentarlo.</small>
        </>
      )}
    </div>
  );
}
