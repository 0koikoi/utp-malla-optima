import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AIRequest } from '../../src/application/ai/contracts';
import {
  crearAIClient, escucharConexion, HttpAIClient, MENSAJE_PAUSA, MENSAJES_ERROR, mensajeLimite, MockAIClient, TIMEOUT_CLIENTE_MS,
} from '../../src/infrastructure/ai/HttpAIClient';
import { crearContextoMinimo } from '../helpers/aiContexto';

const ENDPOINT = 'https://proxy.vercel.app/api/asistente';
const peticion: AIRequest = {
  modo: 'chat', contexto: crearContextoMinimo(), foco: { tipo: 'curso', id: '100000I62N' },
  mensajes: [{ rol: 'user', texto: '¿Qué pasa si lo jalo?' }],
};
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('HttpAIClient', () => {
  it('envía modo, contexto, foco y mensajes; nunca un prompt del sistema', async () => {
    const fetch = vi.fn(async () => json({ texto: 'ok', cursos: [], preguntasSugeridas: [] }));
    await new HttpAIClient({ endpoint: ENDPOINT, fetch, enLinea: () => true }).enviar(peticion);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    const cuerpo = JSON.parse(String(init.body));
    expect(Object.keys(cuerpo).sort()).toEqual(['contexto', 'foco', 'mensajes', 'modo']);
    expect(cuerpo.foco).toEqual({ tipo: 'curso', id: '100000I62N' });
    expect(String(init.body)).not.toMatch(/system|Eres el asistente/);
  });

  it('valida la respuesta y descarta códigos inexistentes', async () => {
    const fetch = vi.fn(async () => json({ texto: 'Mira esto', cursos: ['100000I62N', 'ZZZ999'], preguntasSugeridas: [] }));
    const resultado = await new HttpAIClient({ endpoint: ENDPOINT, fetch, enLinea: () => true }).enviar(peticion);
    expect(resultado).toEqual({ ok: true, respuesta: { texto: 'Mira esto', cursos: ['100000I62N'], preguntasSugeridas: [] } });
  });

  it('sin conexión no llama y devuelve SIN_CONEXION', async () => {
    const fetch = vi.fn();
    const resultado = await new HttpAIClient({ endpoint: ENDPOINT, fetch, enLinea: () => false }).enviar(peticion);
    expect(resultado).toEqual({ ok: false, error: 'SIN_CONEXION', mensaje: 'Sin conexión: el asistente necesita internet.' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lee navigator.onLine por defecto', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const fetch = vi.fn();
    expect((await new HttpAIClient({ endpoint: ENDPOINT, fetch }).enviar(peticion)).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [{ error: 'SIN_SALDO' }, 402, 'SIN_SALDO'],
    [{ error: 'LIMITE' }, 429, 'LIMITE'],
    [{ error: 'RESPUESTA_INVALIDA' }, 502, 'RESPUESTA_INVALIDA'],
    [{ error: 'ENTRADA_INVALIDA' }, 400, 'ENTRADA_INVALIDA'],
    ['<html>', 504, 'PROVEEDOR_CAIDO'],
    ['<html>', 429, 'LIMITE'],
  ] as const)('error %j (%i) → %s con mensaje en español', async (cuerpo, status, codigo) => {
    const fetch = vi.fn(async () => typeof cuerpo === 'string' ? new Response(cuerpo, { status }) : json(cuerpo, status));
    const resultado = await new HttpAIClient({ endpoint: ENDPOINT, fetch, enLinea: () => true }).enviar(peticion);
    expect(resultado).toEqual({ ok: false, error: codigo, mensaje: MENSAJES_ERROR[codigo] });
  });

  it('una respuesta 200 fuera del contrato → RESPUESTA_INVALIDA', async () => {
    const fetch = vi.fn(async () => json({ hola: 1 }));
    expect(await new HttpAIClient({ endpoint: ENDPOINT, fetch, enLinea: () => true }).enviar(peticion))
      .toMatchObject({ ok: false, error: 'RESPUESTA_INVALIDA' });
  });

  it(`aborta a los ${TIMEOUT_CLIENTE_MS / 1000} s → PROVEEDOR_CAIDO`, async () => {
    vi.useFakeTimers();
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolver, rechazar) => {
      init.signal!.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')));
    }));
    const promesa = new HttpAIClient({ endpoint: ENDPOINT, fetch: fetch as unknown as typeof globalThis.fetch, enLinea: () => true }).enviar(peticion);
    await vi.advanceTimersByTimeAsync(TIMEOUT_CLIENTE_MS);
    expect(await promesa).toMatchObject({ ok: false, error: 'PROVEEDOR_CAIDO' });
  });

  it('todos los códigos tienen mensaje en español', () => {
    expect(Object.values(MENSAJES_ERROR).every((mensaje) => mensaje.length > 10)).toBe(true);
  });
});

describe('MockAIClient y crearAIClient', () => {
  it('sin endpoint en desarrollo usa el mock local; con endpoint, HTTP', () => {
    expect(crearAIClient({ VITE_AI_ENDPOINT: '', DEV: true })).toBeInstanceOf(MockAIClient);
    expect(crearAIClient({ VITE_AI_ENDPOINT: ENDPOINT, DEV: true })).toBeInstanceOf(HttpAIClient);
    expect(crearAIClient({ VITE_AI_ENDPOINT: '', DEV: false })).toBeInstanceOf(HttpAIClient);
  });

  it('en producción sin endpoint responde PROVEEDOR_CAIDO', async () => {
    expect(await crearAIClient({ VITE_AI_ENDPOINT: '', DEV: false }).enviar(peticion)).toMatchObject({ ok: false, error: 'PROVEEDOR_CAIDO' });
  });

  it('el mock local responde según el contrato, solo con cursos del contexto', async () => {
    const resultado = await new MockAIClient({ esperaMs: 0, enLinea: () => true }).enviar(peticion);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok || !('texto' in resultado.respuesta)) throw new Error('se esperaba una respuesta de chat');
    expect(resultado.respuesta.texto).toContain('HERRAMIENTAS DE DESARROLLO');
    const catalogo = peticion.contexto.catalogo.map((curso) => curso.codigo);
    expect(resultado.respuesta.cursos.every((codigo) => catalogo.includes(codigo))).toBe(true);
  });

  it('el mock local también respeta la falta de conexión', async () => {
    expect(await new MockAIClient({ esperaMs: 0, enLinea: () => false }).enviar(peticion)).toMatchObject({ error: 'SIN_CONEXION' });
  });
});

describe('escucharConexion', () => {
  it('avisa con los eventos online/offline y deja de escuchar', () => {
    const eventos = new EventTarget();
    vi.stubGlobal('window', eventos);
    const cambios: boolean[] = [];
    const dejar = escucharConexion((enLinea) => cambios.push(enLinea));
    eventos.dispatchEvent(new Event('offline'));
    eventos.dispatchEvent(new Event('online'));
    dejar();
    eventos.dispatchEvent(new Event('offline'));
    expect(cambios).toEqual([false, true]);
  });
});

describe('HttpAIClient - control de gasto', () => {
  const enviarCon = async (cuerpo: unknown, status: number) => {
    const fetch = vi.fn(async () => json(cuerpo, status));
    return new HttpAIClient({ endpoint: ENDPOINT, fetch, enLinea: () => true, zonaHoraria: 'America/Lima' }).enviar(peticion);
  };

  it('PAUSADO y SIN_SALDO muestran el mismo aviso de pausa; nunca se habla de saldo', async () => {
    for (const [codigo, status] of [['PAUSADO', 503], ['SIN_SALDO', 402]] as const) {
      const resultado = await enviarCon({ error: codigo }, status);
      expect(resultado).toEqual({ ok: false, error: codigo, mensaje: MENSAJE_PAUSA });
    }
    expect(MENSAJE_PAUSA).toBe('El asistente está en pausa por mantenimiento. Vuelve a intentarlo más tarde.');
    expect(Object.values(MENSAJES_ERROR).join(' ')).not.toMatch(/saldo/i);
  });

  it('LIMITE del proxy muestra la hora aproximada en que se libera', async () => {
    // 22:00 UTC = 17:00 en Lima.
    const resultado = await enviarCon({ error: 'LIMITE', mensaje: 'x', reintentarEn: '2026-10-23T22:00:00.000Z' }, 429);
    expect(resultado).toEqual({
      ok: false, error: 'LIMITE',
      mensaje: 'Llegaste al límite de consultas por ahora. Intenta de nuevo en un rato. Se libera hacia las 17:00.',
    });
  });

  it('LIMITE sin hora (por ejemplo, el 429 de DeepSeek) muestra solo el mensaje', async () => {
    expect(await enviarCon({ error: 'LIMITE' }, 429)).toMatchObject({ mensaje: MENSAJES_ERROR.LIMITE });
    expect(mensajeLimite(undefined)).toBe('Llegaste al límite de consultas por ahora. Intenta de nuevo en un rato.');
  });
});
