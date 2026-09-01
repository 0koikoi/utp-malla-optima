import React from 'react';
import type { Curso } from '../types/academic';
import { useAcademicStore } from '../store/useAcademicStore';
import { isCursoDesbloqueado } from '../utils/academicGraph';
import { GripVertical } from 'lucide-react';

interface Props {
  curso: Curso;
}

export const CourseCard: React.FC<Props> = ({ curso }) => {
  const { cursos, cursosSeleccionadosParaMatricula, toggleSeleccionMatricula } = useAcademicStore();
  
  const estaSeleccionado = cursosSeleccionadosParaMatricula.includes(curso.codigo);
  const desbloqueado = isCursoDesbloqueado(curso, cursos);
  const esAprobado = curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', curso.codigo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = () => {
    if (!esAprobado) {
      toggleSeleccionMatricula(curso.codigo);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`course-card flex-shrink-0 w-64 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none relative group
        ${esAprobado ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-100' : ''}
        ${curso.estado === 'EN_CURSO' ? 'bg-blue-950/40 border-blue-700/80 text-blue-100 ring-1 ring-blue-500/30' : ''}
        ${curso.estado === 'PENDIENTE' && !desbloqueado ? 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-60' : ''}
        ${curso.estado === 'PENDIENTE' && desbloqueado ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500 shadow-md' : ''}
        ${estaSeleccionado ? 'ring-2 ring-indigo-400 bg-indigo-950/60 border-indigo-400 shadow-indigo-950/50' : ''}
      `}
    >
      <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mb-1">
        <span className="flex items-center gap-1">
          <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          {curso.codigo}
        </span>
        <span className="font-semibold text-slate-300">{curso.creditos} cr</span>
      </div>

      <h4 className="text-xs font-semibold leading-tight mb-2 line-clamp-2 min-h-[32px]">
        {curso.nombre}
      </h4>

      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/60">
        <span className="text-slate-400">{curso.horasSemanales} hrs/sem</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium
          ${esAprobado ? 'bg-emerald-900/60 text-emerald-300' : ''}
          ${curso.estado === 'EN_CURSO' ? 'bg-blue-900/60 text-blue-300' : ''}
          ${curso.estado === 'PENDIENTE' && desbloqueado ? 'bg-indigo-900/60 text-indigo-300' : ''}
          ${curso.estado === 'PENDIENTE' && !desbloqueado ? 'bg-slate-800 text-slate-400' : ''}
        `}>
          {curso.estado.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};