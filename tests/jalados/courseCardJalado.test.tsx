import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { CourseCard } from '../../src/components/CourseCard';
import { CourseInfoPopover } from '../../src/components/CourseInfoPopover';
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
  it('un curso EN_CURSO sigue fijo y su (i) abre un menú; la acción no está en la tarjeta visible', () => {
    const enCurso = curso('E', { estado: 'EN_CURSO' });
    const html = renderizar(enCurso, [enCurso]);
    expect(html).not.toContain('Marcar como jalado');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toMatch(/^<div draggable="false"/);
  });

  it('el menú del (i) muestra "Marcar como jalado" solo cuando recibe la acción', () => {
    const enCurso = curso('E', { estado: 'EN_CURSO' });
    const props = { curso: enCurso, requisitos: [], habilitaA: [], posicion: { top: 0, left: 0 } };
    const menu = renderToStaticMarkup(<CourseInfoPopover {...props} onMarcarJalado={() => undefined} />);
    expect(menu).toContain('role="menu"');
    expect(menu).toContain('Marcar como jalado');
    expect(renderToStaticMarkup(<CourseInfoPopover {...props} />)).not.toContain('Marcar como jalado');
  });

  it('una tarjeta que no está EN_CURSO no abre menú', () => {
    const pendiente = curso('P', { ciclo: 8 });
    expect(renderizar(pendiente, [pendiente])).not.toContain('aria-haspopup');
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

  it('un planificado desde el periodo de recuperación sin el jalado allí: "Falta llevar curso jalado"', () => {
    const jalado = curso('J', { jalado: true });
    const dependiente = curso('D', { ciclo: 8, cicloOrigen: 8, prerrequisitos: ['J'] });
    const html = renderizar(dependiente, [jalado, dependiente]);
    expect(html).toContain('curso-invalido');
    expect(html).toContain('Falta llevar curso jalado');
  });

  it('con el jalado en su periodo de recuperación, el dependiente del mismo ciclo: "Prerrequisito sin cumplir"', () => {
    const jalado = curso('J', { jalado: true, ciclo: 8 });
    const dependiente = curso('D', { ciclo: 8, cicloOrigen: 8, prerrequisitos: ['J'] });
    const html = renderizar(dependiente, [jalado, dependiente]);
    expect(html).toContain('Prerrequisito sin cumplir');
    expect(html).not.toContain('Falta llevar curso jalado');
  });
});
