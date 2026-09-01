import React, { useState } from 'react';
import type { Curso } from '../types/academic';
import { CourseCard } from './CourseCard';
import { useAcademicStore } from '../store/useAcademicStore';

interface Props {
  numCiclo: number;
  cursos: Curso[];
}

export const CicloRow: React.FC<Props> = ({ numCiclo, cursos }) => {
  const [isOver, setIsOver] = useState<boolean>(false);
  const moverCursoACiclo = useAcademicStore((state) => state.moverCursoACiclo);

  const totalCreditos = cursos.reduce((acc, c) => acc + c.creditos, 0);
  const totalHoras = cursos.reduce((acc, c) => acc + c.horasSemanales, 0);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const codigoCurso = e.dataTransfer.getData('text/plain');
    if (codigoCurso) {
      moverCursoACiclo(codigoCurso, numCiclo);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col lg:flex-row gap-4 p-4 rounded-2xl border transition-all duration-200
        ${isOver 
          ? 'border-indigo-400 bg-indigo-950/20 ring-2 ring-indigo-500/20' 
          : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/60'
        }
      `}
    >
      {/* Etiqueta vertical izquierda del Ciclo */}
      <div className="lg:w-44 flex-shrink-0 flex lg:flex-col justify-between lg:justify-center border-b lg:border-b-0 lg:border-r border-slate-800 pb-2 lg:pb-0 lg:pr-4">
        <div>
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
            Ciclo {numCiclo}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{cursos.length} asignaturas</p>
        </div>
        <div className="text-right lg:text-left lg:mt-3 text-[11px] font-mono text-slate-500">
          <div>{totalCreditos} créditos</div>
          <div>{totalHoras} hrs/sem</div>
        </div>
      </div>

      {/* Contenedor horizontal con scroll de cursos */}
      <div className="flex-1 overflow-x-auto flex items-center gap-3 pb-2 lg:pb-0 min-h-[110px]">
        {cursos.length === 0 ? (
          <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-800/80 rounded-xl text-xs text-slate-600">
            Arrastra un curso aquí para asignarlo a este ciclo
          </div>
        ) : (
          cursos.map((curso) => <CourseCard key={curso.codigo} curso={curso} />)
        )}
      </div>
    </div>
  );
};