import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ruta = (relativa: string) => fileURLToPath(new URL(relativa, import.meta.url));
const leer = (relativa: string) => readFileSync(ruta(relativa), 'utf8').replace(/\r\n/g, '\n');

describe('despliegue solo en Vercel', () => {
  it('ya no hay workflow ni dependencia de GitHub Pages', () => {
    expect(existsSync(ruta('../../.github/workflows/deploy.yml'))).toBe(false);
    const paquete = JSON.parse(leer('../../package.json')) as { scripts: Record<string, string>; devDependencies: Record<string, string> };
    expect(paquete.devDependencies['gh-pages']).toBeUndefined();
    expect(Object.values(paquete.scripts).join(' ')).not.toMatch(/gh-pages|deploy/);
  });

  it('la base por defecto es "/" y VITE_BASE queda opcional', () => {
    const config = leer('../../vite.config.ts');
    expect(config).toContain("const base = process.env.VITE_BASE ?? '/';");
    expect(config).toMatch(/start_url: base,\s+scope: base,/);
  });

  it('cada proyecto de Vercel se construye solo cuando cambian sus archivos', () => {
    expect(JSON.parse(leer('../../vercel.json')).ignoreCommand)
      .toBe("git diff --quiet HEAD^ HEAD -- . ':(exclude)ai-proxy' ':(exclude)docs'");
    expect(JSON.parse(leer('../../ai-proxy/vercel.json')).ignoreCommand).toBe('git diff --quiet HEAD^ HEAD -- .');
  });

  it('.vercel queda fuera de git en la raíz y en ai-proxy', () => {
    for (const archivo of ['../../.gitignore', '../../ai-proxy/.gitignore']) {
      expect(leer(archivo).split('\n').map((linea) => linea.trim()), archivo).toContain('.vercel');
    }
  });

  it('.env.example documenta VITE_AI_ENDPOINT, VITE_AI_MOCK y VITE_BASE vacíos, y ninguna clave', () => {
    const ejemplo = leer('../../.env.example');
    for (const variable of ['VITE_AI_ENDPOINT', 'VITE_AI_MOCK', 'VITE_BASE']) expect(ejemplo).toMatch(new RegExp(`^${variable}=$`, 'm'));
    expect(ejemplo).not.toMatch(/^DEEPSEEK_API_KEY=/m);
    expect(ejemplo).not.toContain('GitHub Pages');
  });

  it('el README documenta las variables de cada proyecto por entorno', () => {
    const readme = leer('../../README.md');
    for (const variable of ['VITE_AI_ENDPOINT', 'VITE_AI_MOCK', 'DEEPSEEK_API_KEY', 'ALLOWED_ORIGINS', 'AI_SALT', 'AI_PAUSADO',
      'AI_LIMITE_IP_HORA', 'AI_LIMITE_DIARIO', 'KV_REST_API_URL', 'Production', 'Preview']) {
      expect(readme, variable).toContain(variable);
    }
    expect(readme).not.toMatch(/vars\.VITE_AI_ENDPOINT|GitHub Pages \(este frontend\)/);
  });
});
