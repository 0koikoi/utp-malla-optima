import { GraduationCap } from 'lucide-react';
import { useAcademicStore } from '../store/useAcademicStore';

export const DisciplineSelector = () => {
  const { tarifario, disciplinaActiva, setDisciplinaActiva } = useAcademicStore();

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
