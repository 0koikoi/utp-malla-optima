import React, { useState } from 'react';
import type { Curso } from '../types/academic';
import { CourseCard } from './CourseCard';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  cursosPendientes: Curso[];
}

export const BancoPendientes: React.FC<Props> = ({ cursosPendientes }) => {
  const [expandido, setExpandido] = useState<boolean>(true);

  if (cursosPendientes.length === 0) return null;

  return (
    <div className="mb-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div 
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              Banco de Cursos No Llevados ({cursosPendientes.length})
            </h3>
            <p className="text-xs text-slate-400">
              Materias pendientes por cursar. Arrástralas al ciclo en el que planeas llevarlas.
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-200 p-1">
          {expandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {expandido && (
        <div className="mt-4 pt-4 border-t border-slate-800 overflow-x-auto flex items-center gap-3 pb-2">
          {cursosPendientes.map((curso) => (
            <CourseCard key={curso.codigo} curso={curso} />
          ))}
        </div>
      )}
    </div>
  );
};