import { leerUso, type UsoTokens } from './consumo.js';
import { esquemaRespuesta, parsearRespuesta, type AIErrorCodigo, type AIRequest, type AIRespuesta } from './contracts.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';

export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
export const MODELO_POR_DEFECTO = 'deepseek-flash';

export class ErrorProveedor extends Error {
  readonly codigo: AIErrorCodigo;
  readonly status: number;

  constructor(codigo: AIErrorCodigo, status: number) {
    super(codigo);
    this.codigo = codigo;
    this.status = status;
  }
}

/** Mensajes para DeepSeek: system = prompt + esquema; user = contexto (con el foco); luego el historial. */
export const construirMensajes = (peticion: AIRequest) => [
  {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\nESQUEMA JSON de la respuesta (modo "${peticion.modo}"):\n${JSON.stringify(esquemaRespuesta(peticion.modo))}`,
  },
  { role: 'user', content: `CONTEXTO:\n${JSON.stringify(peticion.contexto)}` },
  ...peticion.mensajes.map((mensaje) => ({ role: mensaje.rol, content: mensaje.texto })),
];

/** Tope de salida por modo (incluiría el razonamiento): el análisis trae 5 secciones; el chat, un párrafo. */
export const MAX_TOKENS = { analisis: 1800, chat: 900 } as const;
export const TEMPERATURA = 0.3;

/** Se agrega al final si la respuesta anterior terminó con finish_reason "length". */
export const AVISO_CORTADA = 'Tu respuesta anterior fue demasiado larga y se cortó. Responde de nuevo con máximo 60 palabras en chat o 2 frases por sección en análisis.';

export interface MensajeModelo {
  role: string;
  content: string;
}

/**
 * Sin herramientas, búsqueda web ni fetch: tienen cobro aparte. Sin razonamiento: thinking viene activado por
 * defecto y gastaba todo max_tokens, y la tarea es redactar datos ya calculados.
 * https://api-docs.deepseek.com/api/create-chat-completion
 */
export const construirCuerpo = (peticion: AIRequest, modelo: string, extra: MensajeModelo[] = []) => ({
  model: modelo,
  messages: [...construirMensajes(peticion), ...extra],
  thinking: { type: 'disabled' },
  response_format: { type: 'json_object' },
  temperature: TEMPERATURA,
  max_tokens: MAX_TOKENS[peticion.modo],
  stream: false,
});

const errorPorStatus = (status: number): ErrorProveedor => {
  if (status === 402) return new ErrorProveedor('SIN_SALDO', 402);
  if (status === 429) return new ErrorProveedor('LIMITE', 429);
  // 5xx y errores de configuración (400/401/422) no los puede resolver el estudiante.
  return new ErrorProveedor('PROVEEDOR_CAIDO', 502);
};

/** Lo que devolvió DeepSeek en un intento (solo para diagnóstico: la evaluación lo guarda, producción no). */
export interface IntentoCrudo {
  finishReason: string | null;
  /** `usage` tal cual, incluido completion_tokens_details si viene. */
  usage: unknown;
  /** true si la respuesta trajo `reasoning_content` no vacío. */
  razonamiento: boolean;
  contenido: string;
}

export interface OpcionesLlamada {
  apiKey: string;
  modelo: string;
  fetch: typeof fetch;
  signal: AbortSignal;
  /** Se llama con el `usage` y el finish_reason de cada respuesta 200 (también la de un reintento). */
  alUsar?: (uso: UsoTokens, finishReason: string | null) => void;
  /** Se llama antes de cada petición HTTP a DeepSeek. */
  alIntentar?: () => void;
  /** Diagnóstico: se llama con cada respuesta 200 cruda. Producción no lo usa (llevaría contenido). */
  alResponder?: (intento: IntentoCrudo) => void;
}

type Intento = { tipo: 'ok'; respuesta: AIRespuesta } | { tipo: 'cortada' } | { tipo: 'invalida' };

const intentar = async (peticion: AIRequest, opciones: OpcionesLlamada, extra: MensajeModelo[]): Promise<Intento> => {
  let respuesta: Response;
  opciones.alIntentar?.();
  try {
    respuesta = await opciones.fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opciones.apiKey}` },
      body: JSON.stringify(construirCuerpo(peticion, opciones.modelo, extra)),
      signal: opciones.signal,
    });
  } catch {
    throw new ErrorProveedor('PROVEEDOR_CAIDO', opciones.signal.aborted ? 504 : 502);
  }
  if (!respuesta.ok) throw errorPorStatus(respuesta.status);
  try {
    const datos = await respuesta.json() as {
      choices?: { finish_reason?: string; message?: { content?: string; reasoning_content?: string } }[]; usage?: unknown;
    };
    const eleccion = datos.choices?.[0];
    opciones.alUsar?.(leerUso(datos.usage), eleccion?.finish_reason ?? null);
    const contenido = eleccion?.message?.content ?? '';
    opciones.alResponder?.({
      finishReason: eleccion?.finish_reason ?? null, usage: datos.usage ?? null,
      razonamiento: Boolean(eleccion?.message?.reasoning_content), contenido,
    });
    if (eleccion?.finish_reason === 'length') return { tipo: 'cortada' };
    return { tipo: 'ok', respuesta: parsearRespuesta(peticion.modo, JSON.parse(contenido), peticion.contexto) };
  } catch {
    if (opciones.signal.aborted) throw new ErrorProveedor('PROVEEDOR_CAIDO', 504);
    return { tipo: 'invalida' };
  }
};

/**
 * Llama a DeepSeek con un solo reintento: si se cortó (finish_reason "length"), con AVISO_CORTADA al final;
 * si no fue JSON válido según el contrato, igual que la primera vez.
 */
export const llamarDeepSeek = async (peticion: AIRequest, opciones: OpcionesLlamada): Promise<AIRespuesta> => {
  const primero = await intentar(peticion, opciones, []);
  if (primero.tipo === 'ok') return primero.respuesta;
  const extra = primero.tipo === 'cortada' ? [{ role: 'system', content: AVISO_CORTADA }] : [];
  const segundo = await intentar(peticion, opciones, extra);
  if (segundo.tipo === 'ok') return segundo.respuesta;
  throw new ErrorProveedor(segundo.tipo === 'cortada' ? 'RESPUESTA_LARGA' : 'RESPUESTA_INVALIDA', 502);
};
