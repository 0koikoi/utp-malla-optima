import { randomUUID } from 'node:crypto';
import { AIRequestSchema, MENSAJE_LIMITE, parsearRespuesta, type AIErrorCodigo, type AIErrorResponse } from './contracts.js';
import { ErrorProveedor, llamarDeepSeek, MODELO_POR_DEFECTO } from './deepseek.js';
import {
  comprobarLimites, crearLimitadorMemoria, ipDe, leerLimites, type LimitesConfig, type RateLimiter,
} from './limites.js';
import { generarRespuestaMock } from './mockRespuestas.js';

export const MAX_BODY_BYTES = 64 * 1024;
export const TIMEOUT_MS = 30_000;
export const ESPERA_MOCK_MS = 800;

export interface ConfigProxy {
  apiKey: string | null;
  modelo: string;
  origenes: string[];
  /** Responder con mocks en lugar de llamar a DeepSeek. */
  mock: boolean;
  /** AI_PAUSADO=true: interruptor de gasto; responde PAUSADO sin llamar a nadie. */
  pausado: boolean;
  limites: LimitesConfig;
  /** Debe vivir fuera de la invocación (ver api/asistente.ts) para que el contador en memoria sirva. */
  limitador: RateLimiter;
  ahora: () => number;
  esperaMockMs: number;
  timeoutMs: number;
  fetch: typeof fetch;
  registrar: (entrada: { resultado: 'ok' | AIErrorCodigo; modo: string; ms: number; mock: boolean }) => void;
}

type Entorno = Record<string, string | undefined>;

const SAL_DE_INSTANCIA = randomUUID();

/**
 * Mock: AI_MOCK=true lo fuerza, y fuera de producción (VERCEL_ENV distinto de "production", como en las
 * previews de los PRs) se usa siempre, aunque haya clave: así nunca gastan.
 */
export const leerConfig = (env: Entorno, base: Partial<ConfigProxy> = {}): ConfigProxy => {
  const apiKey = env.DEEPSEEK_API_KEY?.trim() || null;
  return {
    apiKey,
    modelo: env.DEEPSEEK_MODEL?.trim() || MODELO_POR_DEFECTO,
    origenes: (env.ALLOWED_ORIGINS ?? '').split(',').map((origen) => origen.trim().replace(/\/$/, '')).filter(Boolean),
    mock: env.AI_MOCK === 'true' || env.VERCEL_ENV !== 'production',
    pausado: env.AI_PAUSADO === 'true',
    limites: leerLimites(env, SAL_DE_INSTANCIA),
    limitador: crearLimitadorMemoria(),
    ahora: Date.now,
    esperaMockMs: ESPERA_MOCK_MS,
    timeoutMs: TIMEOUT_MS,
    fetch: globalThis.fetch.bind(globalThis),
    // Solo código de resultado y duración: nunca el contexto ni los mensajes.
    registrar: (entrada) => console.info(JSON.stringify({ evento: 'asistente', ...entrada })),
    ...base,
  };
};

const cabecerasCors = (origen: string) => ({
  'Access-Control-Allow-Origin': origen,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const json = (cuerpo: unknown, status: number, origen: string | null) => new Response(JSON.stringify(cuerpo), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(origen ? cabecerasCors(origen) : {}) },
});

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

export const crearHandlers = (config: ConfigProxy) => {
  const origenPermitido = (request: Request) => {
    const origen = request.headers.get('origin')?.replace(/\/$/, '') ?? '';
    return config.origenes.includes(origen) ? origen : null;
  };

  const OPTIONS = async (request: Request): Promise<Response> => {
    const origen = origenPermitido(request);
    return origen ? new Response(null, { status: 204, headers: cabecerasCors(origen) }) : new Response(null, { status: 403 });
  };

  const POST = async (request: Request): Promise<Response> => {
    const inicio = Date.now();
    const origen = origenPermitido(request);
    let modo = 'desconocido';
    const terminar = (resultado: 'ok' | AIErrorCodigo, cuerpo: unknown, status: number) => {
      config.registrar({ resultado, modo, ms: Date.now() - inicio, mock: config.mock });
      return json(cuerpo, status, origen);
    };
    const fallar = (codigo: AIErrorCodigo, status: number, extra: Omit<AIErrorResponse, 'error'> = {}) =>
      terminar(codigo, { error: codigo, ...extra }, status);

    // Sin un Origin de ALLOWED_ORIGINS no se lee el cuerpo ni se llama a DeepSeek (además de no dar CORS).
    if (!origen) return fallar('ENTRADA_INVALIDA', 403);
    if (config.pausado) return fallar('PAUSADO', 503);
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fallar('ENTRADA_INVALIDA', 413);
    const texto = await request.text();
    if (new TextEncoder().encode(texto).length > MAX_BODY_BYTES) return fallar('ENTRADA_INVALIDA', 413);

    let datos: unknown;
    try {
      datos = JSON.parse(texto);
    } catch {
      return fallar('ENTRADA_INVALIDA', 400);
    }
    const peticion = AIRequestSchema.safeParse(datos);
    if (!peticion.success) return fallar('ENTRADA_INVALIDA', 400);
    modo = peticion.data.modo;

    if (config.mock) {
      await esperar(config.esperaMockMs);
      const respuesta = parsearRespuesta(peticion.data.modo, generarRespuestaMock(peticion.data), peticion.data.contexto);
      return terminar('ok', respuesta, 200);
    }
    if (!config.apiKey) return fallar('PROVEEDOR_CAIDO', 503);

    // Los límites solo cuentan llamadas reales: el mock no gasta.
    const limite = await comprobarLimites(config.limitador, config.limites, ipDe(request), config.ahora());
    if (!limite.ok) return fallar('LIMITE', 429, { mensaje: MENSAJE_LIMITE, reintentarEn: limite.reintentarEn });

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), config.timeoutMs);
    try {
      const respuesta = await llamarDeepSeek(peticion.data, {
        apiKey: config.apiKey, modelo: config.modelo, fetch: config.fetch, signal: controlador.signal,
      });
      return terminar('ok', respuesta, 200);
    } catch (error) {
      if (error instanceof ErrorProveedor) return fallar(error.codigo, error.status);
      return fallar('PROVEEDOR_CAIDO', 502);
    } finally {
      clearTimeout(temporizador);
    }
  };

  return { POST, OPTIONS };
};
