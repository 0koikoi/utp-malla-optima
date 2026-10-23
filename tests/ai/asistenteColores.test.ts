import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8');
const css = leer('../../src/components/ai/asistente.css');
const tokensApp = leer('../../src/styles/tokens.css');
const temaApp = leer('../../src/styles/theme.css');

/** Variables declaradas en el primer bloque que empieza con `selector {`. */
const bloque = (fuente: string, selector: string): Record<string, string> => {
  const inicio = fuente.indexOf(`${selector} {`);
  const cuerpo = fuente.slice(inicio, fuente.indexOf('}', inicio));
  return Object.fromEntries([...cuerpo.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, nombre, valor]) => [nombre, valor.trim()]));
};

// Cada tema resuelve var() con las variables de la app de ese mismo tema.
const app = bloque(tokensApp, ':root');
const claro = { ...app, ...bloque(css, ':root') };
const oscuro = { ...app, ...bloque(temaApp, ':root[data-theme="dark"]'), ...bloque(css, ':root[data-theme="dark"]') };

const resolver = (valor: string, tema: Record<string, string>): string => {
  const referencia = valor.match(/^var\((--[\w-]+)\)$/);
  if (!referencia) return valor;
  const siguiente = tema[referencia[1]];
  if (!siguiente) throw new Error(`Variable sin definir: ${referencia[1]}`);
  return resolver(siguiente, tema);
};

const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16) / 255)
    .map((canal) => canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [claroL, oscuroL] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claroL + 0.05) / (oscuroL + 0.05);
};

const TEXTO: [string, string][] = [
  ['--ia-head-t', '--ia-head-bg'], ['--ia-head-muted', '--ia-head-bg'],
  ['--ia-bot-t', '--ia-bot-bg'], ['--ia-muted', '--ia-bot-bg'], ['--ia-muted', '--ia-bg'], ['--ia-bot-t', '--ia-bg'],
  ['--ia-user-t', '--ia-user-bg'], ['--ia-accent-t', '--ia-accent'],
  ['--ia-ok-t', '--ia-ok-bg'], ['--ia-atencion-t', '--ia-atencion-bg'], ['--ia-riesgo-t', '--ia-riesgo-bg'],
  ['--ia-chip-t', '--ia-chip-bg'], ['--ia-input-t', '--ia-input-bg'],
];
// Elementos no textuales (iconos de botones, puntos de estado, botón flotante): 3:1.
const NO_TEXTO: [string, string][] = [
  ['--ia-accent-t', '--ia-accent-hov'], ['--ia-online', '--ia-head-bg'], ['--ia-offline', '--ia-head-bg'], ['--ia-accent', '--ia-bg'],
];

describe.each([['claro', claro], ['oscuro', oscuro]] as const)('colores del asistente - modo %s', (_tema, tokens) => {
  const color = (nombre: string) => resolver(tokens[nombre], tokens);

  it.each(TEXTO)('%s sobre %s cumple AA (4.5:1)', (texto, fondo) => {
    expect(contraste(color(texto), color(fondo))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NO_TEXTO)('%s sobre %s cumple 3:1', (frente, fondo) => {
    expect(contraste(color(frente), color(fondo))).toBeGreaterThanOrEqual(3);
  });
});

describe('paleta pedida', () => {
  const valor = (tokens: Record<string, string>, nombre: string) => resolver(tokens[nombre], tokens).toUpperCase();

  it('modo claro', () => {
    expect([
      '--ia-bg', '--ia-head-bg', '--ia-head-t', '--ia-bot-bg', '--ia-bot-border', '--ia-bot-t', '--ia-user-bg', '--ia-user-t',
      '--ia-accent', '--ia-accent-hov', '--ia-online', '--ia-offline', '--ia-ok-t', '--ia-ok-bg', '--ia-atencion-t',
      '--ia-atencion-bg', '--ia-riesgo-t', '--ia-riesgo-bg',
    ].map((nombre) => valor(claro, nombre))).toEqual([
      '#F8FAFC', '#0F172A', '#FFFFFF', '#FFFFFF', '#E2E8F0', '#0F172A', '#1E293B', '#FFFFFF',
      '#C8102E', '#A50D26', '#16A34A', '#94A3B8', '#15803D', '#DCFCE7', '#B45309', '#FEF3C7', '#B91C1C', '#FEE2E2',
    ]);
  });

  it('modo oscuro (sobre el toggle data-theme="dark")', () => {
    const oscuroResuelto = (nombre: string) => valor(oscuro, nombre);
    expect([
      '--ia-bg', '--ia-head-bg', '--ia-bot-bg', '--ia-bot-t', '--ia-bot-border', '--ia-user-bg', '--ia-user-t',
      '--ia-accent', '--ia-accent-hov', '--ia-online', '--ia-offline', '--ia-ok-t', '--ia-ok-bg', '--ia-atencion-t',
      '--ia-atencion-bg', '--ia-riesgo-t', '--ia-riesgo-bg',
    ].map(oscuroResuelto)).toEqual([
      '#0B1220', '#111827', '#1E293B', '#E2E8F0', '#334155', '#334155', '#F8FAFC',
      '#E11D48', '#F43F5E', '#22C55E', '#64748B', '#4ADE80', '#052E16', '#FBBF24', '#451A03', '#F87171', '#450A0A',
    ]);
  });
});
