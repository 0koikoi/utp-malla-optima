// CursoCard — tarjeta de curso con arrastre (@dnd-kit) y tooltip en portal
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import type { Curso } from '@/types/malla';
import { useMallaStore } from '@/store/mallaStore';

interface CursoCardProps {
  curso: Curso;
  compacto?: boolean;
  isOverlay?: boolean;
}

export function CursoCard({ curso, isOverlay = false }: CursoCardProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const diccionario = useMallaStore((s) => s.cursos);

  const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
  const esArrastrable = !esAprobado && !isOverlay;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: curso.codigo,
    data: { curso },
    disabled: !esArrastrable,
  });

  const claseEst = esAprobado ? curso.estado.toLowerCase() : '';
  const claseT = curso.tipo === 'O' ? 'obligatorio' : 'electivo';
  const textoT = curso.tipo === 'O' ? 'Obligatorio' : 'Electivo';
  const claseTag = curso.tipo === 'O' ? 'obl' : 'ele';
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

  const cardClasses = [
    'curso-card',
    claseEst,
    claseT,
    sinSucesores ? 'no-habilita' : '',
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
        data-horas={curso.horas}
        data-creditos={curso.creditos}
        data-estado={curso.estado}
        data-ciclo-origen={curso.cicloOrigen}
        data-codigo={curso.codigo}
        style={{
          opacity: isDragging ? 0.35 : 1,
          touchAction: esArrastrable ? 'none' : undefined,
          cursor: isOverlay ? 'grabbing' : esArrastrable ? 'grab' : 'default',
        }}
        {...(esArrastrable ? listeners : {})}
        {...(esArrastrable ? attributes : {})}
      >
        {sinSucesores && (
          <span className="no-hab-mark" title="Este curso no abre ningún otro">×</span>
        )}
        <div className="curso-titulo" title={curso.nombre}>
          {curso.nombre}
        </div>
        <div className="curso-tags">
          <span className="ctag">C{curso.cicloOrigen}</span>
          <span className="ctag ctag-horas">{curso.horas}h</span>
          <span className="ctag">{curso.creditos} crd</span>
          <span className={`ctag ${claseTag}`}>{textoT}</span>
        </div>
        {!isOverlay && (
          <i
            className="fas fa-info-circle btn-info-flotante"
            onMouseEnter={handleInfoEnter}
            onMouseLeave={() => setTooltipVisible(false)}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Tooltip renderizado en portal */}
      {tooltipVisible &&
        !isDragging &&
        createPortal(
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
                    <i className="fas fa-lock" /> Prerrequisitos:
                  </b>
                  {curso.prerequisitos.map((c) => (
                    <div key={c}>{diccionario[c]?.nombre || c}</div>
                  ))}
                </>
              ) : (
                <div>
                  <i className="fas fa-lock-open" /> Sin prerrequisitos
                </div>
              )}
            </div>
            <hr />
            <div className="tt-hab">
              {curso.habilitaA.length > 0 ? (
                <>
                  <b>
                    <i className="fas fa-key" /> Habilita:
                  </b>
                  {curso.habilitaA.map((h, idx) => (
                    <div key={idx}>{h}</div>
                  ))}
                </>
              ) : (
                <div>
                  <i className="fas fa-ban" /> No es prerrequisito de ningún otro curso
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
