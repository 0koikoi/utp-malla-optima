import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Curso, PeriodoIngreso } from '../../src/types/academic';
import { CourseCard } from '../../src/components/CourseCard';
import { useAcademicStore } from '../../src/store/useAcademicStore';

const curso = (codigo: string, cambios: Partial<Curso> = {}): Curso => ({
  codigo, nombre: codigo, ciclo: 7, cicloOrigen: 7, tipoPeriodo: 'REGULAR', ubicacion: 'periodo',
  horasSemanales: 4, creditos: 4, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE', ...cambios,
});

const renderizar = (objetivo: Curso, cursos: Curso[], periodoIngreso: PeriodoIngreso = 'marzo') => {
  // En render de servidor zustand lee getInitialState(), así que se siembra también ahí.
  const estado = { cursos, cicloActual: 7, periodoIngreso };
  Object.assign(useAcademicStore.getInitialState(), estado);
  useAcademicStore.setState(estado);
  return renderToStaticMarkup(<CourseCard curso={objetivo} />);
};

/** Orden en el HTML: chips → línea de estados → fila de íconos (absoluta, al pie). */
const posicion = (html: string, marca: string) => {
  const indice = html.indexOf(marca);
  expect(indice, marca).toBeGreaterThanOrEqual(0);
  return indice;
};

const jalado = curso('J', { jalado: true, cicloJalado: 7 });

describe('Etiquetas de estado de la tarjeta', () => {
  it.each([
    ['Jalado · llevar en Ciclo 8', jalado, [jalado], 'marzo'],
    ['Jalado · llevar en Verano 7 o Ciclo 8', jalado, [jalado], 'agosto'],
    ['Falta llevar curso jalado', curso('D', { ciclo: 8, cicloOrigen: 8 }), [jalado, curso('D', { ciclo: 8, cicloOrigen: 8 })], 'marzo'],
    ['Prerrequisito sin cumplir', curso('D', { ciclo: 8, cicloOrigen: 8, prerrequisitos: ['J'] }),
      [{ ...jalado, ciclo: 8 }, curso('D', { ciclo: 8, cicloOrigen: 8, prerrequisitos: ['J'] })], 'marzo'],
  ] as const)('"%s" va en su propia línea, debajo de los chips', (texto, objetivo, cursos, ingreso) => {
    const html = renderizar(objetivo, [...cursos], ingreso);
    expect(html).toContain('con-estado');
    expect(html).toContain(texto);
    expect(posicion(html, 'curso-tags')).toBeLessThan(posicion(html, 'curso-estados'));
    expect(posicion(html, 'curso-estados')).toBeLessThan(posicion(html, texto));
    // El texto va en un solo elemento para que pueda partirse en varias líneas.
    expect(html).toMatch(new RegExp(`<span>${texto}</span>`));
  });

  it('sin etiqueta de estado no se reserva la línea', () => {
    const pendiente = curso('P', { ciclo: 8, cicloOrigen: 8 });
    const html = renderizar(pendiente, [pendiente]);
    expect(html).not.toContain('curso-estados');
    expect(html).not.toContain('con-estado');
  });

  it('el CSS reserva bajo las etiquetas el alto de la fila de íconos y permite el salto de línea', () => {
    const css = readFileSync(fileURLToPath(new URL('../../src/styles/cards.css', import.meta.url)), 'utf8');
    const regla = (selector: string) => {
      const inicio = css.indexOf(`${selector} {`);
      expect(inicio, selector).toBeGreaterThanOrEqual(0);
      return css.slice(inicio, css.indexOf('}', inicio));
    };
    const px = (bloque: string, propiedad: string) => Number(new RegExp(`${propiedad}:\\s*(\\d+)px`).exec(bloque)?.[1]);
    const reservado = px(regla('#pozo-cursos .curso-card.con-estado'), 'padding-bottom');
    const iconos = px(regla('.curso-card-actions'), 'bottom') + px(regla('.curso-info-btn'), 'height');
    expect(reservado).toBeGreaterThanOrEqual(iconos);
    expect(regla('.curso-estados .curso-estado-chip')).toMatch(/width: 100%/);
    expect(regla('.curso-estados .curso-estado-chip')).toMatch(/white-space: normal/);
    // Ya no se usa el relleno lateral que dejaba el texto bajo los íconos.
    expect(css).not.toMatch(/jalado-chip[^}]*padding-right/);
  });

  it('en móvil la fila con el aviso de jalados se parte para que el aviso ocupe todo el ancho', () => {
    const responsive = readFileSync(fileURLToPath(new URL('../../src/styles/responsive.css', import.meta.url)), 'utf8');
    expect(responsive).toContain('.tier-dropzone:has(.jalado-recovery-banner) { flex-wrap: wrap; }');
    const planner = readFileSync(fileURLToPath(new URL('../../src/styles/planner.css', import.meta.url)), 'utf8');
    expect(planner).not.toMatch(/\.jalado-recovery-banner span \{[^}]*inline-flex/);
  });
});
