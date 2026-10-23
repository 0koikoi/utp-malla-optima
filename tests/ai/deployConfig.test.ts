import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

describe('deploy del frontend con el asistente', () => {
  it('el build de GitHub Pages recibe VITE_AI_ENDPOINT desde una variable de Actions (no un secreto)', () => {
    const workflow = leer('../../.github/workflows/deploy.yml');
    const build = workflow.slice(workflow.indexOf('- name: Build Project'), workflow.indexOf('- name: Deploy to gh-pages'));
    expect(build).toContain('run: pnpm build');
    expect(build).toContain('VITE_AI_ENDPOINT: ${{ vars.VITE_AI_ENDPOINT }}');
    expect(workflow).not.toContain('secrets.VITE_AI_ENDPOINT');
    expect(workflow).not.toContain('DEEPSEEK');
  });

  it('.vercel queda fuera de git en la raíz y en ai-proxy', () => {
    for (const ruta of ['../../.gitignore', '../../ai-proxy/.gitignore']) {
      expect(leer(ruta).split('\n').map((linea) => linea.trim()), ruta).toContain('.vercel');
    }
  });

  it('.env.example documenta VITE_AI_ENDPOINT vacío y ninguna clave', () => {
    const ejemplo = leer('../../.env.example');
    expect(ejemplo).toMatch(/^VITE_AI_ENDPOINT=$/m);
    expect(ejemplo).not.toMatch(/^DEEPSEEK_API_KEY=/m);
  });
});
