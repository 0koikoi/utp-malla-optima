import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { esHorarioPico, sumarUso, USO_VACIO } from '../../src/consumo.js';
import { AIContextSchema, type AIContext, type AIRequest } from '../../src/contracts.js';
import { ErrorProveedor, llamarDeepSeek, MODELO_POR_DEFECTO, type IntentoCrudo } from '../../src/deepseek.js';
import { TIMEOUT_MS } from '../../src/handler.js';
import { CASOS, type Fixture } from './casos.js';
import { codigoDeSalida, evaluar, type ResultadoLlamada } from './ejecutar.js';
import { nombreReporte, reporteMarkdown, resumenConsola } from './reporte.js';
import { crearFetchSimulado } from './simulado.js';

export interface Argumentos {
  repeticiones: number;
  solo?: string;
  simulado: boolean;
}

export const parsearArgumentos = (argv: string[]): Argumentos => {
  const argumentos: Argumentos = { repeticiones: 3, simulado: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--repeticiones') {
      const valor = Number(argv[++i]);
      if (!Number.isInteger(valor) || valor < 1) throw new Error('--repeticiones necesita un entero mayor que 0.');
      argumentos.repeticiones = valor;
    } else if (argv[i] === '--solo') {
      argumentos.solo = argv[++i];
      if (!argumentos.solo) throw new Error('--solo necesita el id de un caso.');
    } else if (argv[i] === '--simulado') {
      argumentos.simulado = true;
    } else {
      throw new Error(`Opción desconocida: ${argv[i]}`);
    }
  }
  return argumentos;
};

/** KEY=VALOR por línea; ignora comentarios y comillas. Nunca se imprime. */
export const leerEnvLocal = (texto: string): Record<string, string> => Object.fromEntries(texto.split(/\r?\n/)
  .map((linea) => linea.trim())
  .filter((linea) => linea && !linea.startsWith('#') && linea.includes('='))
  .map((linea) => {
    const [clave, ...resto] = linea.split('=');
    return [clave.replace(/^export\s+/, '').trim(), resto.join('=').trim().replace(/^(['"])(.*)\1$/, '$2')];
  }));

export interface ConfigLlamada {
  apiKey: string;
  modelo: string;
  fetch: typeof fetch;
  timeoutMs?: number;
}

/** La misma función que producción (llamarDeepSeek: prompt, temperatura, max_tokens y reintento). */
export const crearLlamada = (config: ConfigLlamada) => async (peticion: AIRequest): Promise<ResultadoLlamada> => {
  let uso = USO_VACIO;
  let intentos = 0;
  const detalle: IntentoCrudo[] = [];
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), config.timeoutMs ?? TIMEOUT_MS);
  try {
    const respuesta = await llamarDeepSeek(peticion, {
      apiKey: config.apiKey, modelo: config.modelo, fetch: config.fetch, signal: controlador.signal,
      alUsar: (parcial) => { uso = sumarUso(uso, parcial); },
      alIntentar: () => { intentos += 1; },
      alResponder: (intento) => { detalle.push(intento); },
    });
    const crudo = detalle.at(-1)?.contenido ?? null;
    return { respuesta, error: null, crudo, uso, intentos, detalle };
  } catch (error) {
    const crudo = detalle.at(-1)?.contenido ?? null;
    return { respuesta: null, error: error instanceof ErrorProveedor ? error.codigo : 'PROVEEDOR_CAIDO', crudo, uso, intentos, detalle };
  } finally {
    clearTimeout(temporizador);
  }
};

const AI_PROXY = new URL('../../', import.meta.url);

export const leerFixture = (nombre: Fixture): AIContext =>
  AIContextSchema.parse(JSON.parse(readFileSync(new URL(`tests/fixtures/${nombre}.json`, AI_PROXY), 'utf8')));

export interface Entorno {
  argv: string[];
  env: Record<string, string | undefined>;
  /** Contenido de ai-proxy/.env.local, o null si no existe. */
  envLocal: string | null;
  fetch: typeof fetch;
  escribirReporte: (nombre: string, contenido: string) => string;
  log: (linea: string) => void;
  ahora: () => Date;
}

export const ejecutarCli = async (entorno: Entorno): Promise<number> => {
  const argumentos = parsearArgumentos(entorno.argv);
  const local = entorno.envLocal ? leerEnvLocal(entorno.envLocal) : {};
  const variable = (clave: string) => local[clave]?.trim() || entorno.env[clave]?.trim() || undefined;
  const apiKey = variable('DEEPSEEK_API_KEY');
  if (!argumentos.simulado && !apiKey) {
    entorno.log('Falta DEEPSEEK_API_KEY en ai-proxy/.env.local. Para probar sin la API: pnpm evaluar --simulado');
    return 3;
  }
  const maxUsd = Number(variable('EVAL_MAX_USD') ?? 1);
  const modelo = variable('DEEPSEEK_MODEL') ?? MODELO_POR_DEFECTO;
  const resultado = await evaluar({
    casos: CASOS,
    fixtures: leerFixture,
    llamar: crearLlamada({ apiKey: apiKey ?? 'simulado', modelo, fetch: argumentos.simulado ? crearFetchSimulado() : entorno.fetch }),
    repeticiones: argumentos.repeticiones,
    solo: argumentos.solo,
    maxUsd: Number.isFinite(maxUsd) && maxUsd > 0 ? maxUsd : 1,
    horarioPico: () => esHorarioPico(entorno.ahora(), variable('DEEPSEEK_PICO_UTC')),
    progreso: entorno.log,
  });
  const meta = { fecha: entorno.ahora(), modelo, repeticiones: argumentos.repeticiones, maxUsd, simulado: argumentos.simulado };
  entorno.log('');
  entorno.log(resumenConsola(resultado, meta));
  const ruta = entorno.escribirReporte(nombreReporte(meta.fecha), reporteMarkdown(resultado, meta));
  entorno.log(`Reporte: ${ruta}`);
  return codigoDeSalida(resultado);
};

/** Entorno real: lee ai-proxy/.env.local y escribe en docs/evaluaciones/. */
export const entornoReal = (): Entorno => {
  const envLocal = new URL('.env.local', AI_PROXY);
  return {
    argv: process.argv.slice(2),
    env: process.env,
    envLocal: existsSync(envLocal) ? readFileSync(envLocal, 'utf8') : null,
    fetch: globalThis.fetch.bind(globalThis),
    escribirReporte: (nombre, contenido) => {
      const carpeta = new URL('../docs/evaluaciones/', AI_PROXY);
      mkdirSync(carpeta, { recursive: true });
      // Dos corridas en el mismo minuto no se pisan: la segunda lleva un sufijo.
      let archivo = new URL(nombre, carpeta);
      for (let n = 2; existsSync(archivo); n += 1) archivo = new URL(nombre.replace(/\.md$/, `-${n}.md`), carpeta);
      writeFileSync(archivo, contenido);
      return fileURLToPath(archivo);
    },
    log: (linea) => console.log(linea),
    ahora: () => new Date(),
  };
};

