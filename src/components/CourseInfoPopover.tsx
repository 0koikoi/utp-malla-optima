import { forwardRef } from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import type { Curso } from '../types/academic';

interface Props {
  curso: Curso;
  requisitos: string[];
  habilitaA: string[];
  posicion: { top: number; left: number };
  /** Solo en el menú fijo de una tarjeta EN_CURSO. */
  onMarcarJalado?: () => void;
}

/** Información del (i): tooltip al pasar el mouse o menú fijo con acciones. */
export const CourseInfoPopover = forwardRef<HTMLDivElement, Props>(function CourseInfoPopover(
  { curso, requisitos, habilitaA, posicion, onMarcarJalado }, ref
) {
  return (
    <div ref={ref} className={`curso-tooltip ${onMarcarJalado ? 'curso-tooltip-menu' : ''}`}
      role={onMarcarJalado ? 'menu' : undefined}
      style={{ position: 'fixed', top: posicion.top, left: posicion.left }}
      onClick={(event) => event.stopPropagation()}>
      <div className="tooltip-course-name">{curso.nombre}</div>
      <section>
        <b><LockKeyhole size={12} /> Prerrequisitos</b>
        {curso.prerrequisitos.length > 0 ? (
          requisitos.map((texto, index) => <div key={curso.prerrequisitos[index]}>{texto}</div>)
        ) : (
          <div>Sin prerrequisitos</div>
        )}
      </section>
      <hr />
      <section className="tooltip-habilita">
        <b>Habilita</b>
        {habilitaA.length > 0 ? (
          habilitaA.map((item, index) => <div key={`${item}-${index}`}>{item}</div>)
        ) : (
          <div>No habilita otro curso de la malla.</div>
        )}
      </section>
      {onMarcarJalado && <>
        <hr />
        <button type="button" role="menuitem" className="curso-jalar-btn" onClick={onMarcarJalado}>
          <RotateCcw size={12} aria-hidden="true" /> Marcar como jalado
        </button>
      </>}
    </div>
  );
});
