import { GraduationCap } from 'lucide-react';
import { usePlannerStore } from '@/store/plannerStore';


export const DisciplineSelector = () => {
  const { tarifario, disciplinaActiva, setDisciplinaActiva } = usePlannerStore();

  if (!tarifario?.disciplinas) return null;

  return (
    <div className="discipline-control">
      <GraduationCap size={14} />
      <select
        id="disciplina-select"
        value={disciplinaActiva}
        onChange={(event) => void setDisciplinaActiva(event.target.value)}
        aria-label="Disciplina para el cálculo de costos"
      >
        {Object.keys(tarifario.disciplinas).map((disciplina) => (
          <option key={disciplina} value={disciplina}>
            {disciplina}
          </option>
        ))}
      </select>
    </div>
  );
};
