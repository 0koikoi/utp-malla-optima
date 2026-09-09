import { useState } from 'react';
import type { DragEvent } from 'react';
import type { Curso } from '../types/academic';
import { CourseCard } from './CourseCard';
import { useAcademicStore } from '../store/useAcademicStore';
import { LockKeyhole, MoveDown } from 'lucide-react';

interface Props {
  numCiclo: number;
  cursos: Curso[];
}

export const CicloRow = ({ numCiclo, cursos }: Props) => {
  const [isOver, setIsOver] = useState(false);
  const { moverCursoACiclo, cursoAMover } = useAcademicStore();

  const cursosOrdenados = [...cursos].sort((a, b) => {
    const aLlevado = a.estado === 'APROBADO' || a.estado === 'CONVALIDADO' ? 0 : 1;
    const bLlevado = b.estado === 'APROBADO' || b.estado === 'CONVALIDADO' ? 0 : 1;
    if (aLlevado !== bLlevado) return aLlevado - bLlevado;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  const cursosParaCarga = cursos.filter(
    (curso) => curso.estado === 'PENDIENTE' || curso.estado === 'EN_CURSO'
  );
  const totalCreditos = cursosParaCarga.reduce((acc, curso) => acc + curso.creditos, 0);
  const totalHoras = cursosParaCarga.reduce((acc, curso) => acc + curso.horasSemanales, 0);
  const cursosLlevados = cursos.filter(
    (curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO'
  ).length;
  const cicloCompletado = cursos.length > 0 && cursosLlevados === cursos.length;
  const cicloAdelantado = cursosLlevados > 0 && !cicloCompletado;

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    const codigo = event.dataTransfer.getData('text/plain');
    if (codigo) void moverCursoACiclo(codigo, numCiclo);
  };

  return (
    <div className={`tier-row ${isOver ? 'is-over' : ''}`} data-ciclo={numCiclo}>
      <div
        className={`tier-label ${cicloCompletado ? 'ciclo-aprobado' : ''} ${cicloAdelantado ? 'ciclo-adelantado' : ''}`}
      >
        <span className="tier-num">{numCiclo}</span>
        <span className="tier-name">Ciclo {numCiclo}</span>
        <div className="tier-stats">
          <span className="stat-chip stat-horas">{totalHoras}h sem.</span>
          <span className="stat-chip">{totalCreditos} cr</span>
        </div>
        {cursosLlevados > 0 && (
          <span className="tier-lock-note">
            <LockKeyhole size={10} /> {cursosLlevados} fijo{cursosLlevados === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div
        className="tier-dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={handleDrop}
      >
        {cursoAMover && (
          <button
            type="button"
            className="tap-move-target"
            onClick={() => void moverCursoACiclo(cursoAMover, numCiclo)}
          >
            <MoveDown size={14} /> Mover aquí
          </button>
        )}

        {cursosOrdenados.length === 0 ? (
          <div className="tier-empty">Arrastra aquí un curso pendiente</div>
        ) : (
          cursosOrdenados.map((curso) => <CourseCard key={curso.codigo} curso={curso} />)
        )}
      </div>
    </div>
  );
};
