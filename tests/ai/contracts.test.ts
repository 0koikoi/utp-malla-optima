import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AIContextSchema, AIRequestSchema, esquemaRespuesta, MAX_TEXTO_MENSAJE, parsearRespuesta,
} from '../../src/application/ai/contracts';
import { crearContextoMinimo } from '../helpers/aiContexto';

const contexto = crearContextoMinimo();
const mensaje = (texto: string) => ({ rol: 'user' as const, texto });

describe('Contratos IA - AIRequest', () => {
  it('acepta una petición de análisis con foco y mensajes', () => {
    const peticion = { modo: 'analisis', contexto, foco: { tipo: 'curso', id: '100000I62N' }, mensajes: [mensaje('Hola')] };
    expect(AIRequestSchema.safeParse(peticion).success).toBe(true);
  });

  it('el contexto mínimo de prueba cumple AIContextSchema', () => {
    expect(AIContextSchema.safeParse(contexto).success).toBe(true);
  });

  it('rechaza más de 8 mensajes', () => {
    const mensajes = Array.from({ length: 9 }, (_, indice) => mensaje(`m${indice}`));
    expect(AIRequestSchema.safeParse({ modo: 'chat', contexto, mensajes }).success).toBe(false);
  });

  it('rechaza textos de más de 1000 caracteres', () => {
    const largo = mensaje('x'.repeat(MAX_TEXTO_MENSAJE + 1));
    expect(AIRequestSchema.safeParse({ modo: 'chat', contexto, mensajes: [largo] }).success).toBe(false);
    const justo = mensaje('x'.repeat(MAX_TEXTO_MENSAJE));
    expect(AIRequestSchema.safeParse({ modo: 'chat', contexto, mensajes: [justo] }).success).toBe(true);
  });

  it('rechaza un modo o un rol desconocidos', () => {
    expect(AIRequestSchema.safeParse({ modo: 'otro', contexto, mensajes: [] }).success).toBe(false);
    expect(AIRequestSchema.safeParse({ modo: 'chat', contexto, mensajes: [{ rol: 'system', texto: 'x' }] }).success).toBe(false);
  });
});

describe('Contratos IA - respuestas', () => {
  const seccion = {
    tipo: 'carga', nivel: 'riesgo', titulo: 'Carga alta', detalle: 'x',
    acciones: ['a'], cursos: ['100000I62N', 'INVENTADO', '100000I62N'],
  };

  it('el análisis descarta códigos inexistentes y duplicados', () => {
    const respuesta = parsearRespuesta('analisis', { resumen: 'r', secciones: [seccion], preguntasSugeridas: [] }, contexto);
    expect(respuesta.secciones[0].cursos).toEqual(['100000I62N']);
  });

  it('el chat descarta códigos inexistentes', () => {
    const respuesta = parsearRespuesta('chat', { texto: 't', cursos: ['XX', '100000S61T'], preguntasSugeridas: ['¿?'] }, contexto);
    expect(respuesta.cursos).toEqual(['100000S61T']);
  });

  it('rechaza más de 3 acciones o 3 preguntas sugeridas', () => {
    const muchas = { ...seccion, acciones: ['1', '2', '3', '4'] };
    expect(() => parsearRespuesta('analisis', { resumen: 'r', secciones: [muchas], preguntasSugeridas: [] }, contexto)).toThrow();
    expect(() => parsearRespuesta('chat', { texto: 't', cursos: [], preguntasSugeridas: ['1', '2', '3', '4'] }, contexto)).toThrow();
  });

  it('rechaza un tipo de sección o nivel desconocido', () => {
    const mala = { ...seccion, nivel: 'grave' };
    expect(() => parsearRespuesta('analisis', { resumen: 'r', secciones: [mala], preguntasSugeridas: [] }, contexto)).toThrow();
  });

  it('genera el esquema JSON de cada modo para el prompt', () => {
    expect(JSON.stringify(esquemaRespuesta('analisis'))).toContain('secciones');
    expect(JSON.stringify(esquemaRespuesta('chat'))).toContain('texto');
  });
});

describe('Contratos IA - copia del proxy', () => {
  it('ai-proxy/src/contracts.ts es idéntico a src/application/ai/contracts.ts', () => {
    const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
    expect(leer('../../ai-proxy/src/contracts.ts')).toBe(leer('../../src/application/ai/contracts.ts'));
  });
});
