import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { AIAnalisisResponseSchema, AIChatResponseSchema, type AIContext, type AIRequest } from '../src/contracts.js';
import { DEEPSEEK_URL } from '../src/deepseek.js';
import { crearHandlers, leerConfig, MAX_BODY_BYTES, type ConfigProxy } from '../src/handler.js';
import { SYSTEM_PROMPT } from '../src/systemPrompt.js';

const leerFixture = (nombre: string): AIContext =>
  JSON.parse(readFileSync(new URL(`./fixtures/${nombre}`, import.meta.url), 'utf8'));
const contexto = leerFixture('contexto.json');
const contextoJalado = leerFixture('contextoJalado.json');

const ORIGEN = 'https://mallau.github.io';
const peticion = (cambios: Partial<AIRequest> = {}): AIRequest => ({ modo: 'analisis', contexto, mensajes: [], ...cambios });

const crear = (cambios: Partial<ConfigProxy> = {}) => {
  const registros: unknown[] = [];
  const config = leerConfig(
    { DEEPSEEK_API_KEY: 'sk-prueba', ALLOWED_ORIGINS: `${ORIGEN},http://localhost:5173`, VERCEL_ENV: 'production' },
    { esperaMockMs: 0, registrar: (entrada) => registros.push(entrada), ...cambios },
  );
  return { ...crearHandlers(config), registros };
};

const post = (cuerpo: unknown, origen: string | null = ORIGEN) => new Request('https://proxy.vercel.app/api/asistente', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(origen ? { Origin: origen } : {}) },
  body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
});

const respuestaDeepSeek = (contenido: unknown, status = 200) => new Response(JSON.stringify({
  choices: [{ message: { content: typeof contenido === 'string' ? contenido : JSON.stringify(contenido) } }],
}), { status });

const analisisValido = {
  resumen: 'Tu plan está cargado.',
  secciones: [{ tipo: 'carga', nivel: 'riesgo', titulo: 'Carga', detalle: '25 h', acciones: ['Mueve un curso.'], cursos: ['100000I62N', 'FALSO'] }],
  preguntasSugeridas: ['¿Estoy sobrecargado?'],
};

describe('proxy - CORS', () => {
  it('OPTIONS responde 204 con CORS solo para orígenes permitidos', async () => {
    const { OPTIONS } = crear();
    const permitido = await OPTIONS(new Request('https://x/api', { method: 'OPTIONS', headers: { Origin: ORIGEN } }));
    expect(permitido.status).toBe(204);
    expect(permitido.headers.get('access-control-allow-origin')).toBe(ORIGEN);
    expect(permitido.headers.get('access-control-allow-methods')).toContain('POST');
    const ajeno = await OPTIONS(new Request('https://x/api', { method: 'OPTIONS', headers: { Origin: 'https://malo.com' } }));
    expect(ajeno.status).toBe(403);
    expect(ajeno.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('POST desde un origen no permitido o sin origen: 403 sin llamar a DeepSeek', async () => {
    const fetch = vi.fn();
    const { POST } = crear({ fetch });
    for (const origen of ['https://malo.com', null]) {
      const respuesta = await POST(post(peticion(), origen));
      expect(respuesta.status).toBe(403);
      expect(respuesta.headers.get('access-control-allow-origin')).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('proxy - validación de entrada', () => {
  it.each([
    ['JSON roto', '{no es json'],
    ['modo desconocido', { ...peticion(), modo: 'otro' }],
    ['más de 8 mensajes', peticion({ modo: 'chat', mensajes: Array.from({ length: 9 }, () => ({ rol: 'user' as const, texto: 'hola' })) })],
    ['texto de más de 1000 caracteres', peticion({ modo: 'chat', mensajes: [{ rol: 'user', texto: 'x'.repeat(1001) }] })],
    ['contexto incompleto', { ...peticion(), contexto: { version: 1 } }],
  ])('%s → 400 ENTRADA_INVALIDA', async (_caso, cuerpo) => {
    const fetch = vi.fn();
    const respuesta = await crear({ fetch }).POST(post(cuerpo));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: 'ENTRADA_INVALIDA' });
    expect(respuesta.headers.get('access-control-allow-origin')).toBe(ORIGEN);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('un body de más de 64 KB → 413', async () => {
    const enorme = JSON.stringify({ ...peticion(), relleno: 'x'.repeat(MAX_BODY_BYTES) });
    const respuesta = await crear({ fetch: vi.fn() }).POST(post(enorme));
    expect(respuesta.status).toBe(413);
    expect(await respuesta.json()).toEqual({ error: 'ENTRADA_INVALIDA' });
  });
});

describe('proxy - llamada a DeepSeek', () => {
  it('envía system (prompt + esquema), user con el CONTEXTO y el historial; sin herramientas', async () => {
    const fetch = vi.fn(async () => respuestaDeepSeek(analisisValido));
    const historial = [{ rol: 'user' as const, texto: 'Hola' }, { rol: 'assistant' as const, texto: '¿En qué te ayudo?' }];
    const respuesta = await crear({ fetch, modelo: 'deepseek-flash' }).POST(post(peticion({ mensajes: historial })));
    expect(respuesta.status).toBe(200);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(DEEPSEEK_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-prueba');
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo).toMatchObject({ model: 'deepseek-flash', response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 1800, thinking: { type: 'disabled' } });
    expect(cuerpo.tools).toBeUndefined();
    expect(cuerpo.tool_choice).toBeUndefined();
    expect(cuerpo.messages[0].role).toBe('system');
    expect(cuerpo.messages[0].content.startsWith(SYSTEM_PROMPT)).toBe(true);
    expect(cuerpo.messages[0].content).toContain('preguntasSugeridas');
    expect(cuerpo.messages[1].role).toBe('user');
    expect(cuerpo.messages[1].content.startsWith('CONTEXTO:\n')).toBe(true);
    expect(JSON.parse(cuerpo.messages[1].content.slice('CONTEXTO:\n'.length))).toEqual(contexto);
    expect(cuerpo.messages[1].content).toContain('"foco":{"tipo":"curso"');
    expect(cuerpo.messages.slice(2)).toEqual([{ role: 'user', content: 'Hola' }, { role: 'assistant', content: '¿En qué te ayudo?' }]);
  });

  it('valida la respuesta y descarta códigos de curso inexistentes', async () => {
    const respuesta = await crear({ fetch: vi.fn(async () => respuestaDeepSeek(analisisValido)) }).POST(post(peticion()));
    const datos = await respuesta.json();
    expect(datos.secciones[0].cursos).toEqual(['100000I62N']);
  });

  it('si la respuesta no es JSON válido, reintenta una vez', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(respuestaDeepSeek('esto no es json'))
      .mockResolvedValueOnce(respuestaDeepSeek(analisisValido));
    const respuesta = await crear({ fetch }).POST(post(peticion()));
    expect(respuesta.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('si vuelve a fallar (JSON o esquema), devuelve RESPUESTA_INVALIDA', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(respuestaDeepSeek('{"resumen": 1}'))
      .mockResolvedValueOnce(respuestaDeepSeek('nada'));
    const respuesta = await crear({ fetch }).POST(post(peticion()));
    expect(respuesta.status).toBe(502);
    expect(await respuesta.json()).toEqual({ error: 'RESPUESTA_INVALIDA' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    [402, 'SIN_SALDO', 402],
    [429, 'LIMITE', 429],
    [500, 'PROVEEDOR_CAIDO', 502],
    [503, 'PROVEEDOR_CAIDO', 502],
    [401, 'PROVEEDOR_CAIDO', 502],
  ])('DeepSeek %i → %s (%i) sin reintentar', async (status, codigo, propio) => {
    const fetch = vi.fn(async () => new Response('{}', { status }));
    const respuesta = await crear({ fetch }).POST(post(peticion()));
    expect(respuesta.status).toBe(propio);
    expect(await respuesta.json()).toEqual({ error: codigo });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red → PROVEEDOR_CAIDO', async () => {
    const respuesta = await crear({ fetch: vi.fn(async () => { throw new TypeError('fetch failed'); }) }).POST(post(peticion()));
    expect(await respuesta.json()).toEqual({ error: 'PROVEEDOR_CAIDO' });
  });

  it('el timeout aborta la llamada → PROVEEDOR_CAIDO (504)', async () => {
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolver, rechazar) => {
      init.signal!.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')));
    }));
    const respuesta = await crear({ fetch: fetch as unknown as typeof globalThis.fetch, timeoutMs: 20 }).POST(post(peticion()));
    expect(respuesta.status).toBe(504);
    expect(await respuesta.json()).toEqual({ error: 'PROVEEDOR_CAIDO' });
  });

  it('registra una sola línea por petición; nunca el contexto ni los mensajes (detalle en consumo.test.ts)', async () => {
    const { POST, registros } = crear({ fetch: vi.fn(async () => respuestaDeepSeek(analisisValido)) });
    await POST(post(peticion({ mensajes: [{ rol: 'user', texto: 'mi secreto' }] })));
    expect(registros).toHaveLength(1);
    expect(JSON.stringify(registros)).not.toContain('secreto');
    expect(JSON.stringify(registros)).not.toContain('100000');
  });
});

describe('proxy - modo mock', () => {
  it('fuera de producción (previews, local) usa siempre el mock, aunque haya clave; en producción solo con AI_MOCK=true', () => {
    expect(leerConfig({}).mock).toBe(true);
    expect(leerConfig({ DEEPSEEK_API_KEY: 'sk' }).mock).toBe(true);
    expect(leerConfig({ DEEPSEEK_API_KEY: 'sk', VERCEL_ENV: 'preview' }).mock).toBe(true);
    expect(leerConfig({ DEEPSEEK_API_KEY: 'sk', VERCEL_ENV: 'development' }).mock).toBe(true);
    expect(leerConfig({ DEEPSEEK_API_KEY: 'sk', NODE_ENV: 'production' }).mock).toBe(true);
    expect(leerConfig({ DEEPSEEK_API_KEY: 'sk', VERCEL_ENV: 'production' }).mock).toBe(false);
    expect(leerConfig({ VERCEL_ENV: 'production' }).mock).toBe(false);
    expect(leerConfig({ VERCEL_ENV: 'production', AI_MOCK: 'true' }).mock).toBe(true);
    expect(leerConfig({}).modelo).toBe('deepseek-flash');
  });

  it('una preview con clave responde con mock y nunca llama a DeepSeek', async () => {
    const fetch = vi.fn();
    const config = leerConfig(
      { DEEPSEEK_API_KEY: 'sk-prueba', VERCEL_ENV: 'preview', ALLOWED_ORIGINS: ORIGEN },
      { fetch, esperaMockMs: 0, registrar: () => undefined },
    );
    const respuesta = await crearHandlers(config).POST(post(peticion()));
    expect(respuesta.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('en producción sin clave ni mock responde PROVEEDOR_CAIDO sin llamar a nadie', async () => {
    const fetch = vi.fn();
    const config = leerConfig({ VERCEL_ENV: 'production', ALLOWED_ORIGINS: ORIGEN }, { fetch, registrar: () => undefined });
    const respuesta = await crearHandlers(config).POST(post(peticion()));
    expect(respuesta.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  const crearMock = () => crear({ mock: true, fetch: vi.fn() });

  it('el análisis mock cumple el contrato y usa los datos reales del contexto', async () => {
    const respuesta = await crearMock().POST(post(peticion()));
    const datos = AIAnalisisResponseSchema.parse(await respuesta.json());
    const porTipo = Object.fromEntries(datos.secciones.map((seccion) => [seccion.tipo, seccion]));
    expect(Object.keys(porTipo).sort()).toEqual(['carga', 'electivos', 'financiero', 'ruta', 'whatIf']);
    expect(porTipo.carga.nivel).toBe(contexto.carga.nivel);
    expect(porTipo.carga.detalle).toContain('25 h');
    expect(porTipo.financiero.detalle).toContain('S/ 5,055.15');
    expect(porTipo.financiero.detalle).toContain('S/ 900.00');
    expect(porTipo.electivos.cursos).toContain('100000I64M');
    expect(datos.secciones.every((seccion) => seccion.acciones.length <= 3)).toBe(true);
  });

  it('con un jalado fuera de su ventana, el mock lo marca como riesgo con su ventana', async () => {
    const datos = await (await crearMock().POST(post(peticion({ contexto: contextoJalado })))).json();
    const whatIf = datos.secciones.find((seccion: { tipo: string }) => seccion.tipo === 'whatIf');
    expect(whatIf).toMatchObject({ nivel: 'riesgo', cursos: ['100000S61T'] });
    expect(whatIf.detalle).toContain('Ciclo 8');
  });

  it.each([
    ['¿Me alcanza mi presupuesto?', 'S/ '],
    ['¿Estoy sobrecargado?', '25 h'],
    ['🗺️ Mi ruta hasta egresar', 'Ciclo 10'],
    ['🎯 ¿Qué electivo me conviene?', 'CALIDAD DE SOFTWARE'],
    ['¿Cuál es la capital de Francia?', 'Solo puedo ayudarte'],
  ])('chat mock: "%s"', async (pregunta, esperado) => {
    const sinFoco = { ...contexto, foco: null };
    const respuesta = await crearMock().POST(post(peticion({ modo: 'chat', contexto: sinFoco, mensajes: [{ rol: 'user', texto: pregunta }] })));
    const datos = AIChatResponseSchema.parse(await respuesta.json());
    expect(datos.texto).toContain(esperado);
  });

  it('chat mock con foco en un curso usa su what-if', async () => {
    const mensajes = [{ rol: 'user' as const, texto: '¿Qué pasa si lo jalo?' }];
    const datos = await (await crearMock().POST(post(peticion({ modo: 'chat', mensajes, foco: { tipo: 'curso', id: '100000I62N' } })))).json();
    expect(datos.texto).toContain('INTELIGENCIA DE NEGOCIOS (100000I62N)');
    // Marzo, ciclo-8 (par): la ventana del contexto es [Verano 8, Ciclo 9] y el mock la nombra.
    expect(contexto.foco).toMatchObject({ whatIf: { ventanaSiJala: ['verano-8', 'ciclo-9'] } });
    expect(datos.texto).toContain('Tendrías que llevarlo en el Verano 8 o en el Ciclo 9');
    expect(datos.cursos[0]).toBe('100000I62N');
  });

  it('el mock espera antes de responder (indicador "escribiendo…")', async () => {
    vi.useFakeTimers();
    try {
      const { POST } = crear({ mock: true, esperaMockMs: 800 });
      let listo = false;
      const promesa = POST(post(peticion())).then((respuesta) => { listo = true; return respuesta; });
      await vi.advanceTimersByTimeAsync(700);
      expect(listo).toBe(false);
      await vi.advanceTimersByTimeAsync(200);
      expect((await promesa).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });
});
