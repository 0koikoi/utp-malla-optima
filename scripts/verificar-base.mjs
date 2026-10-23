// Compila la web con la base de GitHub Pages (sin VITE_BASE) y con VITE_BASE=/ (demo en Vercel)
// y comprueba que index.html, el manifest de la PWA y el service worker usen la misma base.
// Uso: pnpm verify:base
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CASOS = [
  { nombre: 'GitHub Pages (sin VITE_BASE)', env: {}, base: '/utp-malla-optima/' },
  { nombre: 'Vercel (VITE_BASE=/)', env: { VITE_BASE: '/' }, base: '/' },
];

const fallas = [];
const comprobar = (caso, condicion, mensaje) => {
  console.log(`  ${condicion ? 'OK ' : 'FALLA'} ${mensaje}`);
  if (!condicion) fallas.push(`${caso.nombre}: ${mensaje}`);
};

for (const caso of CASOS) {
  const salida = mkdtempSync(join(tmpdir(), 'mallau-base-'));
  try {
    const env = { ...process.env, ...caso.env };
    if (!('VITE_BASE' in caso.env)) delete env.VITE_BASE;
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', salida, '--emptyOutDir', '--logLevel', 'warn'],
      { env, stdio: ['ignore', 'ignore', 'inherit'] });
    const leer = (archivo) => readFileSync(join(salida, archivo), 'utf8');
    const html = leer('index.html');
    const manifest = JSON.parse(leer('manifest.webmanifest'));
    const registro = leer('registerSW.js');
    const sw = leer('sw.js');
    console.log(`${caso.nombre} → base "${caso.base}"`);
    comprobar(caso, new RegExp(`src="${caso.base}assets/[^"]+\\.js"`).test(html), 'index.html carga el JS desde la base');
    comprobar(caso, html.includes(`href="${caso.base}manifest.webmanifest"`), 'index.html enlaza el manifest desde la base');
    comprobar(caso, manifest.start_url === caso.base, `manifest.start_url = "${manifest.start_url}"`);
    comprobar(caso, manifest.scope === caso.base, `manifest.scope = "${manifest.scope}"`);
    comprobar(caso, registro.includes(`register('${caso.base}sw.js', { scope: '${caso.base}' })`), 'registerSW.js registra el service worker en la base');
    comprobar(caso, caso.base === '/' ? !sw.includes('/utp-malla-optima/') : true, 'sw.js no apunta a otra base');
    comprobar(caso, /createHandlerBoundToURL\("index\.html"\)/.test(sw), 'sw.js usa index.html relativo como fallback de navegación');
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
}

if (fallas.length) {
  console.error(`\n${fallas.length} comprobación(es) fallaron:\n- ${fallas.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAmbos builds usan la base correcta.');
