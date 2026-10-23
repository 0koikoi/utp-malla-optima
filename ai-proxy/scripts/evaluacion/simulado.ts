import type { AIRequest } from '../../src/contracts.js';
import { generarRespuestaMock } from '../../src/mockRespuestas.js';

/**
 * fetch simulado con la forma de la API de DeepSeek: responde con los mocks y un `usage` aproximado.
 * Sirve para probar el script completo (llamarDeepSeek, chequeos y reporte) sin gastar.
 */
export const crearFetchSimulado = (): typeof fetch => {
  let llamadas = 0;
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    const cuerpo = JSON.parse(String(init?.body)) as { messages: { role: string; content: string }[] };
    const [system, contexto, ...historial] = cuerpo.messages;
    const peticion: AIRequest = {
      modo: system.content.includes('(modo "analisis")') ? 'analisis' : 'chat',
      contexto: JSON.parse(contexto.content.slice('CONTEXTO:\n'.length)),
      mensajes: historial.map((mensaje) => ({ rol: mensaje.role === 'assistant' ? 'assistant' : 'user', texto: mensaje.content })),
    };
    const contenido = JSON.stringify(generarRespuestaMock(peticion));
    const prompt = Math.ceil(cuerpo.messages.reduce((total, mensaje) => total + mensaje.content.length, 0) / 4);
    // El prefijo (prompt del sistema) se cachea desde la segunda llamada.
    const enCache = llamadas++ === 0 ? 0 : Math.ceil(system.content.length / 4);
    return new Response(JSON.stringify({
      choices: [{ message: { content: contenido } }],
      usage: { prompt_tokens: prompt, prompt_cache_hit_tokens: enCache, prompt_cache_miss_tokens: prompt - enCache, completion_tokens: Math.ceil(contenido.length / 4) },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
};
