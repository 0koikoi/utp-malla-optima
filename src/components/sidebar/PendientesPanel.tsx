// Panel lateral de cursos pendientes (pozo)
// En Fase 0: muestra las tarjetas agrupadas por ciclo de origen
// DnD desde/hacia este panel se activa en Fase 3

import { useMallaStore } from '@/store/mallaStore';
import { useContadorPozo } from '@/store/selectors';
import { CursoCard } from '@/components/planner/CursoCard';
import type { Curso } from '@/types/malla';

export function PendientesPanel() {
  const { cursos, asignaciones } = useMallaStore();
  const totalPendientes = useContadorPozo();

  // Cursos en el pozo agrupados por cicloOrigen
  const cursosPozo = Object.values(cursos)
    .filter((c) => c.estado === 'PENDIENTE' && asignaciones[c.codigo] === 'pozo')
    .sort((a, b) => a.cicloOrigen - b.cicloOrigen);

  const grupos = cursosPozo.reduce<Record<number, Curso[]>>((acc, c) => {
    if (!acc[c.cicloOrigen]) acc[c.cicloOrigen] = [];
    acc[c.cicloOrigen].push(c);
    return acc;
  }, {});

  const hayMalla = Object.keys(cursos).length > 0;

  return (
    <aside id="panel-pendientes" aria-label="Cursos pendientes">
      <div className="aside-head">
        <span className="aside-head-title">
          <i className="fas fa-inbox" style={{ color: '#E8002D' }} /> Pendientes
        </span>
        <span className="aside-count" id="pozo-count">{totalPendientes}</span>
      </div>
      <p className="aside-hint">Arrastra cursos a los ciclos del planificador</p>

      <div className="tier-dropzone" id="pozo-cursos" style={{ flexDirection: 'column', flexWrap: 'nowrap', gap: '3px', padding: '4px 8px 16px' }}>
        {!hayMalla && (
          <div className="pozo-empty" id="pozo-empty">
            <i className="fas fa-file-upload" />
            <p>
              Sube tu <b>Plan_de_Estudio.xlsx</b>
              <br />para comenzar
            </p>
          </div>
        )}

        {hayMalla && cursosPozo.length === 0 && (
          <div className="pozo-empty">
            <i className="fas fa-check-circle" style={{ color: '#84b5be' }} />
            <p>¡Todos los cursos asignados!</p>
          </div>
        )}

        {Object.keys(grupos)
          .map(Number)
          .sort((a, b) => a - b)
          .map((ciclo) => (
            <div key={ciclo}>
              <div className="separador-ciclo">Ciclo {ciclo}</div>
              {grupos[ciclo].map((curso) => (
                <CursoCard key={curso.codigo} curso={curso} compacto />
              ))}
            </div>
          ))}
      </div>
    </aside>
  );
}
