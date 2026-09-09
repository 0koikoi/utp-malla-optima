import type { DragEvent } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Curso } from '../types/academic';
import { useAcademicStore } from '../store/useAcademicStore';
import { isCursoDesbloqueado } from '../utils/academicGraph';
import { Calculator, CircleCheck, Info, LockKeyhole } from 'lucide-react';

interface Props {
  curso: Curso;
  compacto?: boolean;
}

export const CourseCard = ({ curso, compacto = false }: Props) => {
  const {
    cursos,
    cursosSeleccionadosParaMatricula,
    toggleSeleccionMatricula,
    cursoAMover,
    setCursoAMover,
  } = useAcademicStore();

  const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null);
  const estaSeleccionado = cursosSeleccionadosParaMatricula.includes(curso.codigo);
  const desbloqueado = isCursoDesbloqueado(curso, cursos);
  const esAprobado = curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO';
  const esSeleccionMovil = cursoAMover === curso.codigo;
  const habilitaA = cursos.filter((item) => item.prerrequisitos.includes(curso.codigo));

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (esAprobado) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', curso.codigo);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCardClick = () => {
    if (esAprobado) return;
    const esPantallaTactil = window.matchMedia('(pointer: coarse)').matches;
    if (esPantallaTactil) {
      setCursoAMover(esSeleccionMovil ? null : curso.codigo);
      return;
    }
    toggleSeleccionMatricula(curso.codigo);
  };

  const mostrarTooltip = (element: HTMLButtonElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({
      top: rect.bottom + 7,
      left: Math.max(8, Math.min(rect.left - 130, window.innerWidth - 292)),
    });
  };

  const clases = [
    'curso-card',
    curso.tipo === 'OBLIGATORIO' ? 'obligatorio' : 'electivo',
    esAprobado ? 'curso-bloqueado' : '',
    curso.estado === 'EN_CURSO' ? 'en-curso' : '',
    curso.estado === 'PENDIENTE' && !desbloqueado ? 'con-prerrequisitos' : '',
    estaSeleccionado ? 'seleccionado-presupuesto' : '',
    esSeleccionMovil ? 'seleccionado-mover' : '',
    compacto ? 'compacto' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        draggable={!esAprobado}
        onDragStart={handleDragStart}
        onClick={handleCardClick}
        className={clases}
        aria-disabled={esAprobado}
        title={esAprobado ? 'Curso ya llevado: no se puede mover' : undefined}
      >
        <div className="curso-card-head">
          <span className="curso-codigo">{curso.codigo}</span>
          <div className="curso-card-actions">
            {esAprobado && <LockKeyhole size={13} className="curso-lock" />}
            <button
              type="button"
              className={`curso-budget-btn ${estaSeleccionado ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                if (!esAprobado) toggleSeleccionMatricula(curso.codigo);
              }}
              disabled={esAprobado}
              title="Añadir o quitar del presupuesto"
            >
              <Calculator size={13} />
            </button>
            <button
              type="button"
              className="curso-info-btn"
              onMouseEnter={(event) => mostrarTooltip(event.currentTarget)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => mostrarTooltip(event.currentTarget)}
              onBlur={() => setTooltip(null)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Ver requisitos de ${curso.nombre}`}
            >
              <Info size={14} />
            </button>
          </div>
        </div>

        <div className="curso-titulo">{curso.nombre}</div>

        <div className="curso-tags">
          <span className="ctag">C{curso.cicloOrigen}</span>
          <span className="ctag ctag-horas">{curso.horasSemanales}h</span>
          <span className="ctag">{curso.creditos} cr</span>
          <span className={`ctag ${curso.tipo === 'OBLIGATORIO' ? 'obl' : 'ele'}`}>
            {curso.tipo === 'OBLIGATORIO' ? 'Obligatorio' : 'Electivo'}
          </span>
        </div>

        {esAprobado && (
          <div className="curso-estado-chip">
            <CircleCheck size={11} /> {curso.estado === 'APROBADO' ? 'Aprobado' : 'Convalidado'}
          </div>
        )}
      </div>

      {tooltip &&
        createPortal(
          <div
            className="curso-tooltip"
            style={{ position: 'fixed', top: tooltip.top, left: tooltip.left }}
          >
            <section>
              <b><LockKeyhole size={12} /> Prerrequisitos</b>
              {curso.prerrequisitos.length > 0 ? (
                curso.prerrequisitos.map((codigo) => {
                  const req = cursos.find((item) => item.codigo === codigo);
                  return <div key={codigo}>{req ? `${codigo} · ${req.nombre}` : codigo}</div>;
                })
              ) : (
                <div>Sin prerrequisitos</div>
              )}
            </section>
            <hr />
            <section className="tooltip-habilita">
              <b>Habilita</b>
              {habilitaA.length > 0 ? (
                habilitaA.map((item) => <div key={item.codigo}>{item.nombre}</div>)
              ) : (
                <div>No habilita otro curso de la malla.</div>
              )}
            </section>
          </div>,
          document.body
        )}
    </>
  );
};
