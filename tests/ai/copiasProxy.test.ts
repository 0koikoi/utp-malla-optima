import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

describe('archivos compartidos con ai-proxy', () => {
  it('ai-proxy/src/mockRespuestas.ts es idéntico a src/application/ai/mockRespuestas.ts', () => {
    expect(leer('../../ai-proxy/src/mockRespuestas.ts')).toBe(leer('../../src/application/ai/mockRespuestas.ts'));
  });
});
