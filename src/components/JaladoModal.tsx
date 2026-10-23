import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check } from 'lucide-react';
import type { Curso } from '../types/academic';
import { crearPeriodoAcademico } from '../domain/rules/academicPeriodRules';
import { simularJalado } from '../domain/services/whatIfService';
import { textoVentana, ventanaJalado } from '../domain/rules/jaladoRules';
import { useAcademicStore } from '../store/useAcademicStore';
import { pluralizar } from '../utils/pluralizar';

interface Props {
  curso: Curso;
  onClose: () => void;
}

const etiquetaPeriodo = (periodoId: string) => {
  const [tipo, ciclo] = periodoId.split('-');
  return crearPeriodoAcademico(tipo === 'verano' ? 'VERANO' : 'REGULAR', Number(ciclo)).etiqueta;
};

/** Confirmación propia (sin window.confirm) con la vista previa de simularJalado. */
export function JaladoModal({ curso, onClose }: Props) {
  const cursos = useAcademicStore((state) => state.cursos);
  const marcarComoJalado = useAcademicStore((state) => state.marcarComoJalado);
  const ventana = useAcademicStore((state) =>
    textoVentana(ventanaJalado({ ...curso, estado: 'PENDIENTE', jalado: true, cicloJalado: curso.ciclo }, state.cursos, state)));
  const [guardando, setGuardando] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const simulacion = useMemo(() => simularJalado(curso.codigo, cursos), [curso.codigo, cursos]);
  const nombres = useMemo(() => new Map(cursos.map((item) => [item.codigo, item.nombre])), [cursos]);

  useLayoutEffect(() => {
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);

  const confirmar = async () => {
    setGuardando(true);
    try {
      await marcarComoJalado(curso.codigo);
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="context-backdrop planning-confirm-backdrop" onMouseDown={onClose}>
      <section ref={modalRef} className="context-modal planning-confirm-modal jalado-modal" role="dialog" aria-modal="true"
        aria-label={`Marcar ${curso.nombre} como jalado`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); onClose(); }
          if (event.key === 'Tab') {
            const botones = modalRef.current?.querySelectorAll<HTMLButtonElement>('button');
            const primero = botones?.[0];
            const ultimo = botones?.[botones.length - 1];
            if ((event.shiftKey && document.activeElement === primero) || (!event.shiftKey && document.activeElement === ultimo)) {
              event.preventDefault();
              (event.shiftKey ? ultimo : primero)?.focus();
            }
          }
        }}>
        <div className="context-modal-body">
          <AlertTriangle size={25} />
          <h2>Marcar como jalado</h2>
          <p><b>{curso.nombre}</b> quedará como jalado en su ciclo. Mientras siga ahí no cuenta como prerrequisito ni se cotiza.</p>
          {ventana && <p className="jalado-recovery-note"><b>Deberás llevarlo {ventana}.</b> Hasta agregarlo allí no podrás sumar otros cursos a ese periodo ni a los siguientes.</p>}
          {simulacion.cursosBloqueados.length > 0 ? <>
            <h3>{pluralizar(simulacion.cursosBloqueados.length, 'Curso que no podrás llevar', 'Cursos que no podrás llevar')} hasta aprobarlo</h3>
            <ul className="jalado-preview-list">
              {simulacion.cursosBloqueados.map((item) => <li key={item.codigo}>
                <span>{item.codigo}</span><strong>{item.nombre}</strong><small>Origen C{item.cicloOrigen}</small>
              </li>)}
            </ul>
          </> : <p>No bloquea ningún otro curso de la malla.</p>}
          {simulacion.planificadosInvalidos.length > 0 && <>
            <h3>{pluralizar(simulacion.planificadosInvalidos.length, 'Planificado que quedará inválido', `${simulacion.planificadosInvalidos.length} planificados que quedarán inválidos`)}</h3>
            <ul className="jalado-preview-list jalado-preview-invalid">
              {simulacion.planificadosInvalidos.map((item) => <li key={item.codigo}>
                <span>{item.codigo}</span><strong>{nombres.get(item.codigo)}</strong><small>{etiquetaPeriodo(item.periodoId)}</small>
              </li>)}
            </ul>
            <p className="jalado-preview-note">{pluralizar(simulacion.planificadosInvalidos.length,
              'No se moverá: quedará marcado para que lo reubiques.', 'No se moverán: quedarán marcados para que los reubiques.')}</p>
          </>}
          <div className="confirm-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="button" className="context-save" disabled={guardando} onClick={() => void confirmar()}>
              <Check size={15} /> Marcar como jalado
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
