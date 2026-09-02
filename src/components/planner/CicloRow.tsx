// CicloRow — fila de un ciclo en el planificador con DropZone integrado
import { useMallaStore } from '@/store/mallaStore';
import { useFinanzasCiclos } from '@/store/selectors';
import { CursoCard } from './CursoCard';
import { DropZone } from './DropZone';
import { formatSoles } from '@/utils/finance';

interface CicloRowProps {
  cicloNum: number;
  tipo: 'regular' | 'verano';
}

export function CicloRow({ cicloNum, tipo }: CicloRowProps) {
  const { cursos, asignaciones } = useMallaStore();
  const finanzasList = useFinanzasCiclos();

  const cicloId = tipo === 'regular' ? `ciclo-${cicloNum}` : `verano-${cicloNum}`;
  const finanzas = finanzasList.find((f) => f.cicloId === cicloId);

  // Cursos en este ciclo
  const cursosEnCiclo = Object.values(cursos).filter(
    (c) => asignaciones[c.codigo] === cicloId
  );
  const cursosPendientes = cursosEnCiclo.filter((c) => c.estado === 'PENDIENTE');
  const cursosAprobados = cursosEnCiclo.filter((c) =>
    ['APROBADO', 'CONVALIDADO'].includes(c.estado)
  );

  // Estado visual del label (aprobado/adelantado)
  const aprobadosCount = cursosAprobados.length;
  const labelClass = [
    'tier-label',
    aprobadosCount >= 3 ? 'ciclo-aprobado' : '',
    aprobadosCount >= 1 && aprobadosCount < 3 ? 'ciclo-adelantado' : '',
    finanzas?.excesoHoras || finanzas?.excesoCreditosVerano ? 'peligro' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const nombreCiclo =
    tipo === 'regular'
      ? `Ciclo ${cicloNum}${cicloNum > 10 ? ' ⚠' : ''}`
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
        <span className="tier-num">{cicloNum}</span>
        <span className="tier-name">{nombreCiclo}</span>
        <div className="tier-stats">
          <span className="stat-chip stat-horas">
            <span className="contador-horas">{horas}</span>h sem.
          </span>
          <span className="stat-chip">
            <span className="contador-creditos">{creditos}</span> crd
          </span>
          <span className="ciclo-costo-val">
            <b className="costo-val">{formatSoles(costoFinal)}</b>
            {horas > 0 && (
              <span className="ciclo-mat mat-info">+S/{matricula.toFixed(0)} matrícula</span>
            )}
          </span>
        </div>
      </div>

      {/* Zona de drop receptora */}
      <DropZone id={cicloId} className="tier-dropzone zona-ciclo">
        {[...cursosAprobados, ...cursosPendientes].map((curso) => (
          <CursoCard key={curso.codigo} curso={curso} />
        ))}
      </DropZone>
    </div>
  );
}
