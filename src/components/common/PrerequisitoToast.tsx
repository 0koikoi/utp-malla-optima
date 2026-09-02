// Toast de notificación cuando un drop es bloqueado por prerrequisitos
// Muestra el código y nombre de cada curso prerrequisito pendiente
import { useEffect } from 'react';

interface CursoRef {
  codigo: string;
  nombre: string;
}

interface PrerequisitoToastProps {
  cursoNombre: string;
  faltantes: CursoRef[];
  onClose: () => void;
}

export function PrerequisitoToast({ cursoNombre, faltantes, onClose }: PrerequisitoToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#1f2139',
        borderLeft: '4px solid #ef233c',
        color: '#ffffff',
        padding: '14px 18px',
        borderRadius: '4px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
        zIndex: 999999,
        maxWidth: '400px',
        fontSize: '0.78rem',
        lineHeight: '1.5',
        animation: 'slideIn 0.22s ease-out',
      }}
    >
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <i className="fas fa-lock" style={{ color: '#ef233c', fontSize: '0.85rem' }} />
        <b style={{ fontSize: '0.82rem' }}>No se puede matricular este curso</b>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: 0,
          }}
          title="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Curso bloqueado */}
      <div style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '10px' }}>
        Para matricular <b style={{ color: '#fff' }}>{cursoNombre}</b>, primero
        debes llevar {faltantes.length === 1 ? 'el siguiente prerequisito' : 'los siguientes prerequisitos'}:
      </div>

      {/* Lista de prerrequisitos con código y nombre */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {faltantes.map((f) => (
          <li
            key={f.codigo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239,35,60,0.1)',
              borderRadius: '3px',
              padding: '5px 9px',
            }}
          >
            <i className="fas fa-exclamation-circle" style={{ color: '#ef233c', fontSize: '0.7rem', flexShrink: 0 }} />
            <span style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>
              {f.codigo}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{f.nombre}</span>
          </li>
        ))}
      </ul>

      {/* Sugerencia */}
      <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
        Asigna {faltantes.length === 1 ? 'ese curso' : 'esos cursos'} a un ciclo anterior y vuelve a intentarlo.
      </div>
    </div>
  );
}
