import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = (ruta: string) => fileURLToPath(new URL(`../../${ruta}`, import.meta.url));

describe('finales de línea estables en Windows', () => {
  it('.gitattributes fuerza LF en todos los archivos de texto', () => {
    const atributos = readFileSync(raiz('.gitattributes'), 'utf8').split(/\r?\n/).map((linea) => linea.trim());
    expect(atributos).toContain('* text=auto eol=lf');
    expect(atributos).toContain('*.xlsx binary');
  });

  it('los snapshots versionados usan LF, como los escribe Vitest', () => {
    for (const ruta of [
      'tests/ai/__snapshots__/buildAIContext.test.ts.snap',
      'ai-proxy/tests/__snapshots__/systemPrompt.test.ts.snap',
    ]) {
      expect(readFileSync(raiz(ruta), 'utf8').includes('\r'), ruta).toBe(false);
    }
  });
});
