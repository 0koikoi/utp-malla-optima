// Toast de notificación cuando un drop es bloqueado por prerrequisitos
// Muestra el código y nombre de cada curso prerrequisito pendiente
import { useEffect } from 'react';
import { AlertTriangle, Lock, AlertCircle, X } from 'lucide-react';

interface CursoRef {
  codigo: string;
  nombre: string;
}

interface PrerequisitoToastProps {
  cursoNombre: string;
  faltantes: CursoRef[];
  tipo?: 'bloqueo' | 'cascada';
  onClose: () => void;
}

export function PrerequisitoToast({ cursoNombre, faltantes, tipo = 'bloqueo', onClose }: PrerequisitoToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), tipo === 'cascada' ? 7000 : 5000);
    return () => clearTimeout(timer);
  }, [onClose, tipo]);

  const esCascada = tipo === 'cascada';
  const colorBorde = esCascada ? '#F59E0B' : '#ef233c';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#1f2139',
        borderLeft: `4px solid ${colorBorde}`,
        color: '#ffffff',
        padding: '14px 18px',
        borderRadius: '6px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        zIndex: 999999,
        maxWidth: '420px',
        fontSize: '0.78rem',
        lineHeight: '1.5',
        animation: 'slideIn 0.22s ease-out',
      }}
    >
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        {esCascada ? (
          <AlertTriangle size={15} style={{ color: colorBorde, flexShrink: 0 }} />
        ) : (
          <Lock size={15} style={{ color: colorBorde, flexShrink: 0 }} />
        )}
        <b style={{ fontSize: '0.82rem' }}>
          {esCascada ? 'Atención: Prerrequisitos afectados' : 'No se puede matricular este curso'}
        </b>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Cerrar"
        >
          <X size={15} />
        </button>
      </div>

      {/* Texto descriptivo */}
      <div style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '10px' }}>
        {esCascada ? (
          <>
            Al mover <b style={{ color: '#fff' }}>{cursoNombre}</b>, los siguientes cursos quedaron sin prerrequisito válido:
          </>
        ) : (
          <>
            Para matricular <b style={{ color: '#fff' }}>{cursoNombre}</b>, primero
            debes llevar {faltantes.length === 1 ? 'el siguiente prerrequisito' : 'los siguientes prerrequisitos'}:
          </>
        )}
      </div>

      {/* Lista de cursos afectados o faltantes */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {faltantes.map((f) => (
          <li
            key={f.codigo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: esCascada ? 'rgba(245,158,11,0.12)' : 'rgba(239,35,60,0.1)',
              borderRadius: '4px',
              padding: '5px 9px',
            }}
          >
            {esCascada ? (
              <AlertTriangle size={13} style={{ color: colorBorde, flexShrink: 0 }} />
            ) : (
              <AlertCircle size={13} style={{ color: colorBorde, flexShrink: 0 }} />
            )}
            <span style={{ color: esCascada ? '#FDE68A' : '#FCA5A5', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>
              {f.codigo}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{f.nombre}</span>
          </li>
        ))}
      </ul>

      {/* Sugerencia */}
      <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>
        {esCascada
          ? 'Revisa esos cursos en su ciclo o reubícalos para corregir la secuencia.'
          : `Asigna ${faltantes.length === 1 ? 'ese curso' : 'esos cursos'} a un ciclo anterior y vuelve a intentarlo.`}
      </div>
    </div>
  );
}
