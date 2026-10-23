import {
  AIErrorResponseSchema, parsearRespuesta, type AIErrorCodigo, type AIRequest, type AIRespuesta,
} from '../../application/ai/contracts';
import { generarRespuestaMock } from '../../application/ai/mockRespuestas';

export type ResultadoIA =
  | { ok: true; respuesta: AIRespuesta }
  | { ok: false; error: AIErrorCodigo; mensaje: string };

export interface AIClient {
  readonly esMock: boolean;
  enviar(peticion: AIRequest): Promise<ResultadoIA>;
}

export const TIMEOUT_CLIENTE_MS = 35_000;

export const MENSAJES_ERROR: Record<AIErrorCodigo, string> = {
  SIN_CONEXION: 'Sin conexión: el asistente necesita internet.',
  SIN_SALDO: 'El servicio de IA no tiene saldo por ahora. Inténtalo más tarde.',
  LIMITE: 'Hay muchas consultas en este momento. Espera un minuto e inténtalo de nuevo.',
  PROVEEDOR_CAIDO: 'El asistente no está disponible en este momento. Inténtalo en unos minutos.',
  ENTRADA_INVALIDA: 'No pude enviar tu consulta. Revisa el mensaje e inténtalo otra vez.',
  RESPUESTA_INVALIDA: 'La respuesta de la IA llegó incompleta. Toca Reintentar.',
};

const fallo = (error: AIErrorCodigo): ResultadoIA => ({ ok: false, error, mensaje: MENSAJES_ERROR[error] });

const codigoPorStatus = (status: number): AIErrorCodigo =>
  status === 402 ? 'SIN_SALDO' : status === 429 ? 'LIMITE'
    : status === 400 || status === 413 ? 'ENTRADA_INVALIDA' : 'PROVEEDOR_CAIDO';

const estaEnLinea = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Escucha online/offline para el indicador de estado. Devuelve la función para dejar de escuchar. */
export const escucharConexion = (alCambiar: (enLinea: boolean) => void): (() => void) => {
  const enLinea = () => alCambiar(true);
  const sinConexion = () => alCambiar(false);
  window.addEventListener('online', enLinea);
  window.addEventListener('offline', sinConexion);
  return () => {
    window.removeEventListener('online', enLinea);
    window.removeEventListener('offline', sinConexion);
  };
};

export const conexionActual = estaEnLinea;

interface OpcionesHttp {
  endpoint: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  enLinea?: () => boolean;
}

/** Cliente del proxy ai-proxy. Nunca envía el prompt del sistema: solo modo, contexto, foco y mensajes. */
export class HttpAIClient implements AIClient {
  readonly esMock = false;
  private readonly opciones: Required<OpcionesHttp>;

  constructor(opciones: OpcionesHttp) {
    this.opciones = {
      fetch: globalThis.fetch.bind(globalThis), timeoutMs: TIMEOUT_CLIENTE_MS, enLinea: estaEnLinea, ...opciones,
    };
  }

  async enviar(peticion: AIRequest): Promise<ResultadoIA> {
    const { endpoint, fetch, timeoutMs, enLinea } = this.opciones;
    if (!enLinea()) return fallo('SIN_CONEXION');
    if (!endpoint) return fallo('PROVEEDOR_CAIDO');

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(peticion),
        signal: controlador.signal,
      });
      const datos: unknown = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        const error = AIErrorResponseSchema.safeParse(datos);
        return fallo(error.success ? error.data.error : codigoPorStatus(respuesta.status));
      }
      try {
        return { ok: true, respuesta: parsearRespuesta(peticion.modo, datos, peticion.contexto) };
      } catch {
        return fallo('RESPUESTA_INVALIDA');
      }
    } catch {
      return fallo(enLinea() ? 'PROVEEDOR_CAIDO' : 'SIN_CONEXION');
    } finally {
      clearTimeout(temporizador);
    }
  }
}

/** Mock local para desarrollo sin proxy: la misma lógica que el modo mock del proxy. */
export class MockAIClient implements AIClient {
  readonly esMock = true;
  private readonly esperaMs: number;
  private readonly enLinea: () => boolean;

  constructor({ esperaMs = 800, enLinea = estaEnLinea }: { esperaMs?: number; enLinea?: () => boolean } = {}) {
    this.esperaMs = esperaMs;
    this.enLinea = enLinea;
  }

  async enviar(peticion: AIRequest): Promise<ResultadoIA> {
    if (!this.enLinea()) return fallo('SIN_CONEXION');
    await new Promise((resolver) => setTimeout(resolver, this.esperaMs));
    return { ok: true, respuesta: parsearRespuesta(peticion.modo, generarRespuestaMock(peticion), peticion.contexto) };
  }
}

/** VITE_AI_ENDPOINT vacío en desarrollo → MockAIClient; en producción → HttpAIClient (sin endpoint falla con aviso). */
export const crearAIClient = (env: { VITE_AI_ENDPOINT?: string; DEV?: boolean } = import.meta.env): AIClient => {
  const endpoint = env.VITE_AI_ENDPOINT?.trim() ?? '';
  return !endpoint && env.DEV ? new MockAIClient() : new HttpAIClient({ endpoint });
};
