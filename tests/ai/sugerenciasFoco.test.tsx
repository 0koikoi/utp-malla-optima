import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AIClient, ResultadoIA } from '../../src/infrastructure/ai/HttpAIClient';
import { AsistentePanel, type AccionesPanel } from '../../src/components/ai/AsistentePanel';
import { normalizarPregunta, sinRepetidas, type FocoUI } from '../../src/components/ai/asistenteLogica';
import { crearControladorAsistente } from '../../src/components/ai/controladorAsistente';
import { crearContextoMinimo } from '../helpers/aiContexto';

const sinAccion = () => undefined;
const acciones: AccionesPanel = {
  onCerrar: sinAccion, onNuevaConversacion: sinAccion, onAceptarPrivacidad: sinAccion, onCancelarPrivacidad: sinAccion,
  onAnalizar: sinAccion, onPresupuesto: sinAccion, onPreguntar: sinAccion, onReintentar: sinAccion,
  onAlternarPanel: sinAccion, onCerrarPanel: sinAccion, onElegirFoco: sinAccion, onQuitarFoco: sinAccion,
};
const CURSO: FocoUI = { tipo: 'curso', id: '100000I62N', etiqueta: 'INTELIGENCIA DE NEGOCIOS' };
const CICLO: FocoUI = { tipo: 'ciclo', id: 'ciclo-8', etiqueta: 'Ciclo 8' };

const crear = (respuesta: ResultadoIA = { ok: true, respuesta: { texto: 'ok', cursos: [], preguntasSugeridas: [] } }) => {
  const cliente: AIClient = { esMock: true, enviar: vi.fn(async () => respuesta) };
  return crearControladorAsistente({ cliente, obtenerContexto: () => crearContextoMinimo(), privacidadAceptada: true });
};
type Controlador = ReturnType<typeof crear>;
const html = (controlador: Controlador) => renderToStaticMarkup(<AsistentePanel {...acciones} estado={controlador.obtener()}
  enLinea nombres={new Map()} opciones={{ periodos: [], cursos: [] }} mostrarTooltipRapidas={false} />);
const zonaFoco = (marcado: string) => marcado.slice(marcado.indexOf('class="ia-foco"'), marcado.indexOf('class="ia-barra"'));

describe('A1 - sugerencias del foco', () => {
  it('antes del primer envío el chip trae sus 3 sugerencias', () => {
    const controlador = crear();
    controlador.setFoco(CURSO);
    const zona = zonaFoco(html(controlador));
    expect(zona).toContain('📎 INTELIGENCIA DE NEGOCIOS');
    expect(zona.match(/class="ia-chip"/g)).toHaveLength(3);
  });

  it('después del primer envío con el foco, sobre el input solo queda el chip', async () => {
    const controlador = crear();
    controlador.setFoco(CURSO);
    await controlador.preguntar('¿Qué pasa si lo jalo?');
    const zona = zonaFoco(html(controlador));
    expect(zona).toContain('📎 INTELIGENCIA DE NEGOCIOS');
    expect(zona).toContain('aria-label="Quitar INTELIGENCIA DE NEGOCIOS"');
    expect(zona).not.toContain('Preguntas sobre el foco');
    expect(zona).not.toContain('class="ia-chip"');
  });

  it('volver a elegir el mismo foco no repone las sugerencias; cambiarlo sí', async () => {
    const controlador = crear();
    controlador.setFoco(CURSO);
    await controlador.preguntar('¿Cuánto me cuesta?');
    controlador.setFoco({ ...CURSO });
    expect(controlador.obtener().focoEnviado).toBe(true);
    controlador.setFoco(CICLO);
    expect(controlador.obtener().focoEnviado).toBe(false);
    expect(zonaFoco(html(controlador))).toContain('¿Estoy sobrecargado en este ciclo?');
  });

  it('quitar el foco y volver a ponerlo cuenta como cambio de foco', async () => {
    const controlador = crear();
    controlador.setFoco(CURSO);
    await controlador.preguntar('¿Qué pasa si lo jalo?');
    controlador.setFoco(null);
    controlador.setFoco(CURSO);
    expect(zonaFoco(html(controlador)).match(/class="ia-chip"/g)).toHaveLength(3);
  });

  it('un envío sin foco no marca el foco que se elija después', async () => {
    const controlador = crear();
    await controlador.preguntar('Hola');
    controlador.setFoco(CURSO);
    expect(controlador.obtener().focoEnviado).toBe(false);
  });

  it('"Nueva conversación" limpia el foco y su marca', async () => {
    const controlador = crear();
    controlador.setFoco(CURSO);
    await controlador.preguntar('¿Qué pasa si lo jalo?');
    controlador.nuevaConversacion();
    expect(controlador.obtener()).toMatchObject({ foco: null, focoEnviado: false });
  });
});

describe('A1 - deduplicación de sugerencias', () => {
  it('normaliza sin tildes, mayúsculas ni signos', () => {
    expect(normalizarPregunta('¿Qué pasa si lo JALO?')).toBe('que pasa si lo jalo');
    expect(normalizarPregunta('  ¿Cuánto   me cuesta!! ')).toBe('cuanto me cuesta');
  });

  it('sinRepetidas quita repetidas dentro de la lista y respecto de las excluidas', () => {
    expect(sinRepetidas(['¿Qué pasa si lo jalo?', 'que pasa si lo jalo', '¿Me conviene?', ''], ['ME CONVIENE']))
      .toEqual(['¿Qué pasa si lo jalo?']);
  });

  it('los chips de la respuesta no repiten las sugerencias visibles del foco', async () => {
    const controlador = crear({
      ok: true,
      respuesta: { texto: 'Listo.', cursos: [], preguntasSugeridas: ['¿Estoy sobrecargado en este ciclo?', 'cuanto me cuesta este ciclo', '¿Qué electivo me conviene?'] },
    });
    await controlador.preguntar('Hola');
    controlador.setFoco(CICLO);
    const marcado = html(controlador);
    const chipsRespuesta = marcado.slice(marcado.indexOf('aria-label="Preguntas sugeridas"'), marcado.indexOf('class="ia-entrada-zona"'));
    expect(chipsRespuesta).toContain('¿Qué electivo me conviene?');
    expect(chipsRespuesta).not.toContain('sobrecargado');
    expect(chipsRespuesta).not.toContain('cuesta');
    expect(zonaFoco(marcado)).toContain('¿Estoy sobrecargado en este ciclo?');
  });

  it('tras el primer envío con foco, las sugerencias de la respuesta vuelven a mostrarse completas', async () => {
    const controlador = crear({ ok: true, respuesta: { texto: 'Listo.', cursos: [], preguntasSugeridas: ['¿Cuánto me cuesta este ciclo?'] } });
    controlador.setFoco(CICLO);
    await controlador.preguntar('¿Estoy sobrecargado en este ciclo?');
    expect(html(controlador)).toContain('¿Cuánto me cuesta este ciclo?');
  });
});
