import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import type { Curso } from '@/types/malla';
import { usePlannerStore } from '@/store/plannerStore';
import { Pointer, AlertTriangle, X, Info, Lock, Unlock, Key, Ban } from 'lucide-react';

interface CursoCardProps {
  curso: Curso;
  compacto?: boolean;
  isOverlay?: boolean;
  isLocked?: boolean;
}

export function CursoCard({ curso, isOverlay = false, isLocked = false }: CursoCardProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const {
    cursos: diccionario,
    asignaciones,
    ejecutarMovimiento,
    cursosConPrereqRoto,
    cursoAMover,
    setCursoAMover,
  } = usePlannerStore();

  const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
  const esArrastrable = !esAprobado && !isOverlay;
  const ubicacionActual = asignaciones[curso.codigo] ?? 'pozo';
  const estaEnCiclo = ubicacionActual !== 'pozo';
  const tienePrereqRoto = cursosConPrereqRoto.includes(curso.codigo);
  const esSeleccionadoMover = cursoAMover === curso.codigo;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: curso.codigo,
    data: { curso },
    disabled: !esArrastrable,
  });

  const claseEst = esAprobado ? curso.estado.toLowerCase() : '';
  const claseT = curso.tipo === 'OBLIGATORIO' ? 'obligatorio' : 'electivo';
  const textoT = curso.tipo === 'OBLIGATORIO' ? 'Obligatorio' : 'Electivo';
  const claseTag = curso.tipo === 'OBLIGATORIO' ? 'obl' : 'ele';
  const sinSucesores = !esAprobado && curso.habilitaA.length === 0;

  function handleInfoEnter(e: React.MouseEvent) {
    if (isDragging) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 5,
      left: Math.min(rect.left, window.innerWidth - 230),
    });
    setTooltipVisible(true);
  }

  function handleCardClick() {
    if (isDragging || isOverlay || esAprobado) return;
    const esTactilOMovil = window.matchMedia('(pointer: coarse), (max-width: 768px)').matches;
    if (esTactilOMovil) {
      setCursoAMover(esSeleccionadoMover ? null : curso.codigo);
    }
  }

  const cardClasses = [
    'curso-card',
    claseEst,
    claseT,
    sinSucesores ? 'no-habilita' : '',
    tienePrereqRoto ? 'prereq-warning-card' : '',
    esSeleccionadoMover ? 'seleccionado-mover' : '',
    isDragging ? 'sortable-ghost' : '',
    isOverlay ? 'sortable-chosen' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        ref={esArrastrable ? setNodeRef : undefined}
        className={cardClasses}
        data-horas={typeof curso.horasSemanales === 'number' ? curso.horasSemanales : ((curso as any).horas || 0)}
        data-creditos={curso.creditos}
        data-estado={curso.estado}
        data-ciclo-origen={curso.cicloOrigen}
        data-codigo={curso.codigo}
        onClick={handleCardClick}
        style={{
          opacity: isDragging ? 0.35 : 1,
          touchAction: esArrastrable ? 'none' : undefined,
          cursor: isOverlay ? 'grabbing' : esArrastrable ? 'grab' : 'default',
        }}
        {...(esArrastrable ? listeners : {})}
        {...(esArrastrable ? attributes : {})}
      >
        {/* Badge de selección activa para mover en móvil (Two-Tap de dev) */}
        {esSeleccionadoMover && (
          <span className="badge-moviendo" title="Curso seleccionado para mover">
            <Pointer size={10} className="inline-icon" /> Moviendo
          </span>
        )}

        {/* Badge de advertencia por prerrequisito roto en cascada */}
        {tienePrereqRoto && !esSeleccionadoMover && (
          <span className="badge-prereq-roto" title="Atención: Este curso quedó con prerrequisitos pendientes">
            <AlertTriangle size={11} />
          </span>
        )}

        {/* Botón rápido para desasignar con un solo tap/click */}
        {!isOverlay && !esAprobado && estaEnCiclo && !isLocked && (
          <button
            type="button"
            className="curso-card-quitar-btn"
            title="Devolver al banco de pendientes"
            onClick={(e) => {
              e.stopPropagation();
              ejecutarMovimiento(curso.codigo, 'pozo');
              if (esSeleccionadoMover) setCursoAMover(null);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Devolver ${curso.nombre} al banco`}
          >
            <X size={10} />
          </button>
        )}

        <div className="curso-titulo" title={curso.nombre}>
          {curso.nombre}
        </div>
        <div className="curso-tags">
          <span className="ctag">C{curso.cicloOrigen}</span>
          <span className="ctag ctag-horas">{typeof curso.horasSemanales === 'number' ? curso.horasSemanales : ((curso as any).horas || 0)}h</span>
          <span className="ctag ctag-creditos">{curso.creditos} crd</span>
          {esAprobado ? (
            <span className="ctag ctag-aprobado">✓ Aprobado</span>
          ) : (
            <span className={`ctag ${claseTag}`}>{textoT}</span>
          )}
        </div>

        {!isOverlay && (
          <div className="curso-card-actions" onPointerDown={(e) => e.stopPropagation()}>
            {sinSucesores && !tienePrereqRoto && !esSeleccionadoMover && (
              <span
                className="no-hab-mark"
                title="Este curso no es prerrequisito de ningún otro curso"
                aria-label="No es prerrequisito"
              >
                ×
              </span>
            )}
            <Info
              size={13}
              className="btn-info-flotante"
              onMouseEnter={handleInfoEnter}
              onMouseLeave={() => setTooltipVisible(false)}
              onClick={(e) => {
                e.stopPropagation();
                if (tooltipVisible) setTooltipVisible(false);
                else handleInfoEnter(e);
              }}
              aria-label={`Información de ${curso.nombre}`}
            />
          </div>
        )}
      </div>

      {/* Tooltip renderizado en portal */}
      {tooltipVisible &&
        !isDragging &&
        createPortal(
          <>
            <div
              id="tooltip-global"
              style={{
                display: 'block',
                position: 'fixed',
                top: tooltipPos.top,
                left: tooltipPos.left,
                zIndex: 99999,
              }}
            >
            <div className="tt-req">
              {curso.prerequisitos.length > 0 ? (
                <>
                  <b>
                    <Lock size={11} className="inline-icon" /> Prerrequisitos:
                  </b>
                  {curso.prerequisitos.map((c) => (
                    <div key={c}>{diccionario[c]?.nombre || c}</div>
                  ))}
                </>
              ) : (
                <div>
                  <Unlock size={11} className="inline-icon" /> Sin prerrequisitos
                </div>
              )}
            </div>
            <hr />
            <div className="tt-hab">
              {curso.habilitaA.length > 0 ? (
                <>
                  <b>
                    <Key size={11} className="inline-icon" /> Habilita:
                  </b>
                  {curso.habilitaA.map((h, idx) => (
                    <div key={idx}>{h}</div>
                  ))}
                </>
              ) : (
                <div>
                  <Ban size={11} className="inline-icon" /> No es prerrequisito de ningún otro curso
                </div>
              )}
            </div>
          </div>
          </>,
          document.body
        )}
    </>
  );
}
