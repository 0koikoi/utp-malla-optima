// CursoCard — tarjeta de curso arrastrable
// En Fase 0: muestra la información. DnD se activa en Fase 3.

import { useState } from 'react';
import type { Curso } from '@/types/malla';
import { useMallaStore } from '@/store/mallaStore';

interface CursoCardProps {
  curso: Curso;
  compacto?: boolean; // reservado para Fase 3 (compacto en el pozo)
}

export function CursoCard({ curso }: CursoCardProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const diccionario = useMallaStore((s) => s.cursos);

  const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
  const claseEst = esAprobado ? curso.estado.toLowerCase() : '';
  const claseT = curso.tipo === 'O' ? 'obligatorio' : 'electivo';
  const textoT = curso.tipo === 'O' ? 'Obligatorio' : 'Electivo';
  const claseTag = curso.tipo === 'O' ? 'obl' : 'ele';
  const sinSucesores = !esAprobado && curso.habilitaA.length === 0;

  const preReqHTML =
    curso.prerequisitos.length > 0
      ? curso.prerequisitos
          .map((c) => diccionario[c]?.nombre || c)
          .join(', ')
      : null;

  function handleInfoEnter(e: React.MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 5,
      left: Math.min(rect.left, window.innerWidth - 230),
    });
    setTooltipVisible(true);
  }

  return (
    <>
      <div
        className={[
          'curso-card',
          claseEst,
          claseT,
          sinSucesores ? 'no-habilita' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-horas={curso.horas}
        data-creditos={curso.creditos}
        data-estado={curso.estado}
        data-ciclo-origen={curso.cicloOrigen}
        data-codigo={curso.codigo}
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
        <i
          className="fas fa-info-circle btn-info-flotante"
          onMouseEnter={handleInfoEnter}
          onMouseLeave={() => setTooltipVisible(false)}
        />
      </div>

      {/* Tooltip */}
      {tooltipVisible && (
        <div
          id="tooltip-global"
          style={{ display: 'block', top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="tt-req">
            {preReqHTML ? (
              <>
                <b><i className="fas fa-lock" /> Prerrequisitos:</b>
                <br />
                {preReqHTML}
              </>
            ) : (
              <><i className="fas fa-lock-open" /> Sin prerrequisitos</>
            )}
          </div>
          <hr />
          <div className="tt-hab">
            {curso.habilitaA.length > 0 ? (
              <>
                <b><i className="fas fa-key" /> Habilita:</b>
                <br />
                {curso.habilitaA.join(', ')}
              </>
            ) : (
              <><i className="fas fa-ban" /> No es prerrequisito de ningún otro curso</>
            )}
          </div>
        </div>
      )}
    </>
  );
}
