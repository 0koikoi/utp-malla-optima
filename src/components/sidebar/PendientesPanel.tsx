import { useMallaStore } from '@/store/mallaStore';
import { useContadorPozo } from '@/store/selectors';
import { CursoCard } from '@/components/planner/CursoCard';
import { DropZone } from '@/components/planner/DropZone';
import type { Curso } from '@/types/malla';
import { Inbox, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export function PendientesPanel() {
  const {
    cursos,
    asignaciones,
    drawerMobOpen,
    setDrawerMobOpen,
    cursoAMover,
    setCursoAMover,
    ejecutarMovimiento,
  } = useMallaStore();
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

  function handleHeaderClick() {
    if (window.matchMedia('(max-width: 640px)').matches) {
      setDrawerMobOpen(!drawerMobOpen);
    }
  }

  return (
    <aside
      id="panel-pendientes"
      className={drawerMobOpen ? 'mob-open' : ''}
      aria-label="Cursos pendientes"
    >
      <div className="aside-head" onClick={handleHeaderClick}>
        <span className="aside-head-title">
          <Inbox size={15} style={{ color: '#E8002D' }} /> Pendientes
        </span>
        <span className="aside-count" id="pozo-count">{totalPendientes}</span>
      </div>
      <p className="aside-hint">Arrastra cursos a los ciclos del planificador</p>

      {/* htmlId="pozo-cursos" para que apliquen los selectores CSS de globals.css */}
      <DropZone id="pozo" htmlId="pozo-cursos" className="tier-dropzone">
        {/* Botón Two-Tap de dev: Devolver al banco de pendientes */}
        {cursoAMover && asignaciones[cursoAMover] && asignaciones[cursoAMover] !== 'pozo' && (
          <button
            type="button"
            className="tap-move-target aside-tap-target"
            onClick={() => {
              ejecutarMovimiento(cursoAMover, 'pozo');
              setCursoAMover(null);
            }}
          >
            <Inbox size={13} className="inline-icon" /> Devolver al banco de pendientes
          </button>
        )}
        {!hayMalla && (
          <div className="pozo-empty" id="pozo-empty">
            <FileSpreadsheet size={32} style={{ opacity: 0.35, marginBottom: '6px' }} />
            <p>
              Sube tu <b>Plan_de_Estudio.xlsx</b>
              <br />para comenzar
            </p>
          </div>
        )}

        {hayMalla && cursosPozo.length === 0 && (
          <div className="pozo-empty">
            <CheckCircle2 size={32} style={{ color: '#84b5be', marginBottom: '6px' }} />
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
      </DropZone>
    </aside>
  );
}
