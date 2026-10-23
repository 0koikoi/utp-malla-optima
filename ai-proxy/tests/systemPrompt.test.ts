import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AIChatResponseSchema } from '../src/contracts.js';
import { construirMensajes } from '../src/deepseek.js';
import { SYSTEM_PROMPT } from '../src/systemPrompt.js';

const contexto = JSON.parse(readFileSync(new URL('./fixtures/contexto.json', import.meta.url), 'utf8'));

const archivos = (directorio: string): string[] => readdirSync(directorio).flatMap((nombre) => {
  const ruta = join(directorio, nombre);
  return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
});

describe('prompt del sistema', () => {
  it('es exactamente el texto acordado (persona, glosario, 15 reglas, cierre JSON y ejemplos)', () => {
    const lineas = SYSTEM_PROMPT.split('\n');
    expect(lineas[0]).toBe('Eres el asesor académico IA de MallaU. Hablas con estudiantes de pregrado de la UTP (sede Ate) con la confianza y la empatía de un compañero de últimos ciclos que ya pasó por lo mismo: directo, motivador y cero robótico. Eres una IA: nunca digas que eres una persona, un profesor ni personal de la UTP.');
    for (const titulo of ['CÓMO HABLAS', 'GLOSARIO ESTUDIANTIL (entiéndelo; úsalo solo si el alumno lo usa primero)', 'REGLAS (obligatorias)', 'EJEMPLOS DE TONO']) {
      expect(lineas).toContain(titulo);
    }
    const reglas = lineas.filter((linea) => /^\d+\. /.test(linea)).map((linea) => Number(linea.split('.')[0]));
    expect(reglas).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(lineas).toContain('Responde SIEMPRE con un único objeto JSON válido que cumpla el esquema indicado, sin texto fuera del JSON.');
    // Huella del texto completo: cualquier cambio de redacción debe ser intencional.
    expect(createHash('sha256').update(SYSTEM_PROMPT).digest('hex')).toMatchSnapshot();
  });

  it('es estático: no interpola datos, así el prefijo se reutiliza en la caché de DeepSeek', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\$\{|undefined|null/);
    expect(SYSTEM_PROMPT).not.toContain(String.fromCharCode(13));
  });

  it('no contiene códigos reales de cursos del fixture (los ejemplos son ficticios)', () => {
    const codigos = [...JSON.stringify(contexto).matchAll(/"codigo":"([^"]+)"/g)].map((coincidencia) => coincidencia[1]);
    expect(codigos.length).toBeGreaterThan(50);
    expect(codigos.filter((codigo) => SYSTEM_PROMPT.includes(codigo))).toEqual([]);
    expect(SYSTEM_PROMPT).not.toMatch(/100000[A-Z0-9]{4}/);
  });

  it('los ejemplos de tono son JSON válido según el contrato del modo chat', () => {
    const ejemplos = SYSTEM_PROMPT.split('\n').filter((linea) => linea.startsWith('{"texto"'));
    expect(ejemplos).toHaveLength(3);
    for (const ejemplo of ejemplos) expect(AIChatResponseSchema.safeParse(JSON.parse(ejemplo)).success).toBe(true);
  });

  it('menciona "JSON", requisito de DeepSeek para response_format json_object', () => {
    expect(SYSTEM_PROMPT).toContain('JSON');
  });

  it('el mensaje system lleva el prompt y el esquema del modo pedido', () => {
    const [system] = construirMensajes({ modo: 'chat', contexto, mensajes: [] });
    expect(system.content.startsWith(SYSTEM_PROMPT)).toBe(true);
    expect(system.content).toContain('ESQUEMA JSON de la respuesta (modo "chat")');
    expect(system.content).toContain('"texto"');
  });

  it('el frontend nunca contiene el prompt del sistema', () => {
    const src = fileURLToPath(new URL('../../src', import.meta.url));
    const conPrompt = archivos(src).filter((ruta) => readFileSync(ruta, 'utf8').includes('Eres el asesor académico IA de MallaU'));
    expect(conPrompt).toEqual([]);
  });
});
