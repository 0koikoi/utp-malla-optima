import { usePlannerStore } from '@/store/plannerStore';
import { PrerequisitoToast } from '@/components/common/PrerequisitoToast';

/**
 * ToastContainer — Contenedor centralizado para la pila de notificaciones Toast.
 * Gestiona el apilamiento no solapado de alertas de prerrequisitos y rupturas en cascada.
 */
export function ToastContainer() {
  const { blockedInfo, cascadaAlerta, setBlockedInfo, setCascadaAlerta } = usePlannerStore();

  if (!blockedInfo && !cascadaAlerta) return null;

  return (
    <aside
      className="toast-stack-container"
      aria-label="Notificaciones del planificador"
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '12px',
        pointerEvents: 'none',
        maxWidth: '430px',
        width: 'calc(100vw - 32px)',
      }}
    >
      {cascadaAlerta && (
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
          <PrerequisitoToast
            cursoNombre={cascadaAlerta.cursoNombre}
            faltantes={cascadaAlerta.faltantes}
            tipo="cascada"
            onClose={() => setCascadaAlerta(null)}
          />
        </div>
      )}
      {blockedInfo && (
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
          <PrerequisitoToast
            cursoNombre={blockedInfo.cursoNombre}
            faltantes={blockedInfo.faltantes}
            tipo="bloqueo"
            onClose={() => setBlockedInfo(null)}
          />
        </div>
      )}
    </aside>
  );
}
