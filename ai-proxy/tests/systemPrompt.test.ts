import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { construirMensajes } from '../src/deepseek.js';
import { SYSTEM_PROMPT } from '../src/systemPrompt.js';

const contexto = JSON.parse(readFileSync(new URL('./fixtures/contexto.json', import.meta.url), 'utf8'));

const archivos = (directorio: string): string[] => readdirSync(directorio).flatMap((nombre) => {
  const ruta = join(directorio, nombre);
  return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
});

describe('prompt del sistema', () => {
  it('es exactamente el texto acordado (12 reglas y cierre JSON)', () => {
    const lineas = SYSTEM_PROMPT.split('\n');
    expect(lineas).toHaveLength(15);
    expect(lineas[0]).toBe('Eres el asistente académico de MallaU para estudiantes de pregrado de la UTP (sede Ate). Ayudas a planificar la matrícula usando EXCLUSIVAMENTE los datos del objeto CONTEXTO.');
    expect(lineas[1]).toBe('Reglas:');
    expect(lineas.slice(2, 14).map((linea) => Number(linea.split('.')[0]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(lineas[14]).toBe('Responde SIEMPRE con un único objeto JSON válido que cumpla el esquema indicado, sin texto fuera del JSON.');
    // Huella del texto completo: cualquier cambio de redacción debe ser intencional.
    expect(createHash('sha256').update(SYSTEM_PROMPT).digest('hex')).toMatchSnapshot();
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
    const conPrompt = archivos(src).filter((ruta) => readFileSync(ruta, 'utf8').includes('Eres el asistente académico de MallaU'));
    expect(conPrompt).toEqual([]);
  });
});
