import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { CourseCard } from '../../src/components/CourseCard';
import { useAcademicStore } from '../../src/store/useAcademicStore';

const curso = (codigo: string, cambios: Partial<Curso> = {}): Curso => ({
  codigo, nombre: codigo, ciclo: 7, cicloOrigen: 7, tipoPeriodo: 'REGULAR', ubicacion: 'periodo',
  horasSemanales: 4, creditos: 4, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE', ...cambios,
});

const renderizar = (objetivo: Curso, cursos: Curso[]) => {
  // En render de servidor zustand lee getInitialState(), así que se siembra también ahí.
  const estado = { cursos, cicloActual: 7, periodoIngreso: 'marzo' as const };
  Object.assign(useAcademicStore.getInitialState(), estado);
  useAcademicStore.setState(estado);
  return renderToStaticMarkup(<CourseCard curso={objetivo} />);
};

describe('CourseCard - jalados', () => {
  it('un curso EN_CURSO ofrece la acción "Marcar como jalado" y sigue fijo', () => {
    const enCurso = curso('E', { estado: 'EN_CURSO' });
    const html = renderizar(enCurso, [enCurso]);
    expect(html).toContain('Marcar como jalado');
    expect(html).toContain('draggable="false"');
  });

  it('un jalado en su ciclo muestra la etiqueta "Jalado" y se puede arrastrar', () => {
    const jalado = curso('J', { jalado: true });
    const html = renderizar(jalado, [jalado]);
    expect(html).toContain('Jalado');
    expect(html).toContain('curso-jalado');
    expect(html).not.toContain('Marcar como jalado');
    expect(html).toMatch(/^<div draggable="true"/);
  });

  it('un PENDIENTE normal en un ciclo bloqueado no es jalado ni se arrastra', () => {
    const pendiente = curso('P');
    const html = renderizar(pendiente, [pendiente]);
    expect(html).not.toContain('Jalado');
    expect(html).toMatch(/^<div draggable="false"/);
  });

  it('un planificado cuyo prerrequisito quedó jalado se marca como inválido', () => {
    const jalado = curso('J', { jalado: true });
    const dependiente = curso('D', { ciclo: 8, cicloOrigen: 8, prerrequisitos: ['J'] });
    const html = renderizar(dependiente, [jalado, dependiente]);
    expect(html).toContain('curso-invalido');
    expect(html).toContain('Prerrequisito sin cumplir');
  });
});
