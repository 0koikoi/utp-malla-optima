// CicloRow — fila de un ciclo en el planificador con DropZone integrado
import { useMallaStore } from '@/store/mallaStore';
import { useFinanzasCiclos, useCicloActual } from '@/store/selectors';
import { CursoCard } from './CursoCard';
import { DropZone } from './DropZone';
import { formatSoles } from '@/utils/finance';
import type { UbicacionCurso } from '@/types/malla';
import { Lock, CheckCircle2, ArrowDownCircle } from 'lucide-react';

interface CicloRowProps {
  cicloNum: number;
  tipo: 'regular' | 'verano';
}

export function CicloRow({ cicloNum, tipo }: CicloRowProps) {
  const {
    cursos,
    asignaciones,
    veranoUbicaciones,
    setVeranoUbicacion,
    cursoAMover,
    setCursoAMover,
    ejecutarMovimiento,
  } = useMallaStore();
  const finanzasList = useFinanzasCiclos();
  const cicloActual = useCicloActual();

  const cicloId: UbicacionCurso = tipo === 'regular' ? `ciclo-${cicloNum}` : `verano-${cicloNum}`;
  const finanzas = finanzasList.find((f) => f.cicloId === cicloId);
  const trasCiclo = veranoUbicaciones[cicloNum] ?? (cicloNum * 2);

  // Cursos en este ciclo
  const cursosEnCiclo = Object.values(cursos).filter(
    (c) => asignaciones[c.codigo] === cicloId
  );
  const cursosPendientes = cursosEnCiclo.filter((c) => c.estado === 'PENDIENTE');
  const cursosAprobados = cursosEnCiclo.filter((c) =>
    ['APROBADO', 'CONVALIDADO'].includes(c.estado)
  );

  const isLocked = tipo === 'regular' && cicloNum < cicloActual;

  // Estado visual del label (aprobado/adelantado/locked)
  const aprobadosCount = cursosAprobados.length;
  const creditosAprobados = cursosAprobados.reduce((acc, c) => acc + c.creditos, 0);
  const totalCreditos = cursosEnCiclo.reduce((acc, c) => acc + c.creditos, 0);
  const porcentajeAprobado = totalCreditos > 0 ? creditosAprobados / totalCreditos : 0;

  const labelClass = [
    'tier-label',
    isLocked
      ? 'locked'
      : aprobadosCount === cursosEnCiclo.length && cursosEnCiclo.length > 0
        ? 'ciclo-aprobado'
        : (aprobadosCount >= 3 || (porcentajeAprobado >= 0.5 && cursosEnCiclo.length > 0))
          ? 'ciclo-adelantado'
          : '',
    finanzas?.excesoHoras || finanzas?.excesoCreditosVerano ? 'peligro' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const nombreCiclo =
    tipo === 'regular'
      ? `Ciclo ${cicloNum}`
      : `Verano ${cicloNum}`;

  const horas = finanzas?.horas ?? 0;
  const creditos = finanzas?.creditos ?? 0;
  const costoFinal = finanzas?.costoFinal ?? 0;
  const matricula = finanzas?.matricula ?? 0;

  return (
    <div
      className="tier-row"
      id={`fila-${tipo === 'regular' ? 'ciclo' : 'verano'}-${cicloNum}`}
      data-ciclo={tipo === 'regular' ? cicloNum : `v${cicloNum}`}
      data-tipo={tipo}
    >
      {/* Label lateral */}
      <div
        className={labelClass}
        id={`label-${tipo === 'regular' ? 'ciclo' : 'verano'}-${cicloNum}`}
      >
        <span className="tier-num">
          {isLocked ? <Lock size={12} style={{ marginRight: '6px', opacity: 0.6 }} /> : null}
          {cicloNum}
        </span>
        <span className="tier-name">{nombreCiclo}</span>

        {tipo === 'verano' && (
          <div className="verano-tras-wrap">
            <span className="verano-tras-lbl">Tras:</span>
            <select
              className="verano-tras-select"
              value={trasCiclo}
              onChange={(e) => setVeranoUbicacion(cicloNum, parseInt(e.target.value, 10))}
              title="A qué ciclo sigue cronológicamente este verano"
              aria-label={`Ciclo previo al Verano ${cicloNum}`}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>Ciclo {c}</option>
              ))}
            </select>
          </div>
        )}
        {/* Estadísticas de la fila */}
        {isLocked ? (
          <div className="tier-stats">
            <span className="stat-chip stat-concluido">
              <CheckCircle2 size={11} className="inline-icon" /> Concluido
            </span>
            <span className="stat-chip">
              <span className="contador-creditos">
                {Math.round(cursosAprobados.reduce((sum, c) => sum + c.creditos, 0) * 10) / 10}
              </span> crd
            </span>
            <span className="ciclo-costo-val historico">
              <span className="hist-lbl">Histórico</span>
            </span>
          </div>
        ) : (
          <div className="tier-stats">
            <span className="stat-chip stat-horas">
              <span className="contador-horas">{horas}</span>h sem.
            </span>
            <span className="stat-chip">
              <span className="contador-creditos">{creditos}</span> crd
            </span>
            <span className="ciclo-costo-val">
              <b className="costo-val">{formatSoles(costoFinal)}</b>
              {horas > 0 ? (
                <span className="ciclo-mat mat-info">+S/{matricula.toFixed(0)} matrícula</span>
              ) : (
                <span className="ciclo-mat sin-cursos">Sin proyectar</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Zona de drop receptora */}
      <DropZone id={cicloId} className={`tier-dropzone zona-ciclo ${isLocked ? 'locked' : ''}`} disabled={isLocked}>
        {/* Botón Two-Tap de dev: Mover aquí */}
        {cursoAMover && !isLocked && (
          <button
            type="button"
            className="tap-move-target"
            onClick={(e) => {
              e.stopPropagation();
              ejecutarMovimiento(cursoAMover, cicloId);
              setCursoAMover(null);
            }}
          >
            <ArrowDownCircle size={13} className="inline-icon" /> Mover aquí a {nombreCiclo}
          </button>
        )}

        {cursosEnCiclo.length === 0 ? (
          <div className="ciclo-placeholders-grid" aria-label={`Casillas disponibles en ${nombreCiclo}`}>
            {[1, 2, 3, 4, 5].map((slotNum) => (
              <div key={slotNum} className="curso-card-placeholder">
                <div className="placeholder-header">
                  <span className="placeholder-pill">Casilla {slotNum}</span>
                  <span className="placeholder-add-icon">+</span>
                </div>
                <span className="placeholder-title">Casilla disponible</span>
                <span className="placeholder-hint">Arrastra o asigna un curso</span>
              </div>
            ))}
          </div>
        ) : (
          [...cursosAprobados, ...cursosPendientes].map((curso) => (
            <CursoCard key={curso.codigo} curso={curso} isLocked={isLocked} />
          ))
        )}
      </DropZone>
    </div>
  );
}
