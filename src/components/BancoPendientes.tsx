import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import type { Curso } from '../types/academic';
import { CourseCard } from './CourseCard';
import { useAcademicStore } from '../store/useAcademicStore';
import { ChevronDown, ChevronUp, Inbox, MoveDown } from 'lucide-react';

interface Props {
  cursosPendientes: Curso[];
}

export const BancoPendientes = ({ cursosPendientes }: Props) => {
  const [isOver, setIsOver] = useState(false);
  const [expandido, setExpandido] = useState(true);
  const { moverCursoABanco, cursoAMover, cursos } = useAcademicStore();
  const hayMalla = cursos.length > 0;

  const grupos = useMemo(() => {
    return cursosPendientes.reduce<Record<number, Curso[]>>((acc, curso) => {
      if (!acc[curso.cicloOrigen]) acc[curso.cicloOrigen] = [];
      acc[curso.cicloOrigen].push(curso);
      return acc;
    }, {});
  }, [cursosPendientes]);

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsOver(false);
    const codigo = event.dataTransfer.getData('text/plain');
    if (codigo) void moverCursoABanco(codigo);
  };

  return (
    <aside
      id="panel-pendientes"
      className={`${expandido ? 'expanded' : 'collapsed'} ${isOver ? 'is-over' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      aria-label="Banco de cursos no llevados"
    >
      <button
        type="button"
        className="aside-head"
        onClick={() => setExpandido((actual) => !actual)}
        aria-expanded={expandido}
      >
        <span className="aside-head-title">
          <Inbox size={15} />
          <span>Banco de pendientes</span>
        </span>
        <span className="aside-count">{cursosPendientes.length}</span>
        {expandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {expandido && (
        <>
          <p className="aside-hint">
            Solo aparecen aquí los cursos pendientes que todavía no has planificado.
          </p>

          {cursoAMover && (
            <button
              type="button"
              className="tap-move-target aside-tap-target"
              onClick={() => void moverCursoABanco(cursoAMover)}
            >
              <MoveDown size={14} /> Mover seleccionado al banco
            </button>
          )}

          <div id="pozo-cursos">
            {cursosPendientes.length === 0 ? (
              <div className="pozo-empty">
                <span>{hayMalla ? '✓' : '↑'}</span>
                <p>{hayMalla ? 'Todos los cursos pendientes están planificados.' : 'Sube tu Plan_de_Estudio.xlsx para comenzar.'}</p>
              </div>
            ) : (
              Object.keys(grupos)
                .map(Number)
                .sort((a, b) => a - b)
                .map((ciclo) => (
                  <div className="pozo-grupo" key={ciclo}>
                    <div className="separador-ciclo">Ciclo {ciclo}</div>
                    {grupos[ciclo]
                      .slice()
                      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
                      .map((curso) => (
                        <CourseCard key={curso.codigo} curso={curso} compacto />
                      ))}
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </aside>
  );
};
