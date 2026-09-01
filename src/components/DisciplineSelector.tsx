import React from 'react';
import { useAcademicStore } from '../store/useAcademicStore';
import { GraduationCap, ChevronDown } from 'lucide-react';

export const DisciplineSelector: React.FC = () => {
  const { tarifario, disciplinaActiva, setDisciplinaActiva } = useAcademicStore();

  if (!tarifario || !tarifario.disciplinas) {
    return null;
  }

  const opcionesDisciplinas = Object.keys(tarifario.disciplinas);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label 
        htmlFor="disciplina-select" 
        className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 tracking-wide uppercase"
      >
        <GraduationCap className="w-4 h-4 text-indigo-400" />
        <span>Especialidad / Disciplina</span>
      </label>
      
      <div className="relative">
        <select
          id="disciplina-select"
          value={disciplinaActiva}
          onChange={(e) => setDisciplinaActiva(e.target.value)}
          className="w-full appearance-none bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2.5 pr-8 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer shadow-sm"
        >
          {opcionesDisciplinas.map((disciplina) => (
            <option key={disciplina} value={disciplina} className="bg-slate-900 text-slate-200 py-1">
              {disciplina}
            </option>
          ))}
        </select>
        
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};