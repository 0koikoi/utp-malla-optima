// Toast de notificación cuando un drop es bloqueado por prerrequisitos
import { useEffect } from 'react';

interface PrerequisitoToastProps {
  cursoNombre: string;
  faltantes: string[];
  onClose: () => void;
}

export function PrerequisitoToast({ cursoNombre, faltantes, onClose }: PrerequisitoToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#252742',
        borderLeft: '4px solid #ef233c',
        color: '#ffffff',
        padding: '12px 18px',
        borderRadius: '4px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 999999,
        maxWidth: '380px',
        fontSize: '0.78rem',
        lineHeight: '1.45',
        animation: 'slideIn 0.25s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <i className="fas fa-exclamation-triangle" style={{ color: '#ef233c', fontSize: '0.9rem' }} />
        <b style={{ color: '#ffffff' }}>Prerrequisitos pendientes</b>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ×
        </button>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '4px' }}>
        No puedes matricular <b>{cursoNombre}</b> sin haber aprobado:
      </div>
      <ul style={{ margin: '0', paddingLeft: '18px', color: '#FCA5A5' }}>
        {faltantes.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
