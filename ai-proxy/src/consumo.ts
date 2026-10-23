/**
 * Precios de deepseek-flash en US$ por millón de tokens, horario normal.
 * Fecha de consulta: 2026-10-23 (dados por el autor). En horario pico cuestan el doble.
 */
export const PRECIOS_DEEPSEEK_FLASH = {
  fechaConsulta: '2026-10-23',
  entradaSinCacheUsdPorM: 0.15,
  entradaConCacheUsdPorM: 0.003,
  salidaUsdPorM: 0.6,
  factorHorarioPico: 2,
} as const;

export interface UsoTokens {
  prompt_tokens: number;
  prompt_cache_hit_tokens: number;
  prompt_cache_miss_tokens: number;
  completion_tokens: number;
}

export const USO_VACIO: UsoTokens = {
  prompt_tokens: 0, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 0, completion_tokens: 0,
};

const numero = (valor: unknown) => (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : 0);

/** Lee `usage` de la respuesta de DeepSeek; si falta el desglose de caché, todo cuenta como sin caché. */
export const leerUso = (usage: unknown): UsoTokens => {
  const datos = (usage ?? {}) as Record<string, unknown>;
  const prompt = numero(datos.prompt_tokens);
  const hit = numero(datos.prompt_cache_hit_tokens);
  const miss = datos.prompt_cache_miss_tokens === undefined ? Math.max(0, prompt - hit) : numero(datos.prompt_cache_miss_tokens);
  return { prompt_tokens: prompt, prompt_cache_hit_tokens: hit, prompt_cache_miss_tokens: miss, completion_tokens: numero(datos.completion_tokens) };
};

export const sumarUso = (a: UsoTokens, b: UsoTokens): UsoTokens => ({
  prompt_tokens: a.prompt_tokens + b.prompt_tokens,
  prompt_cache_hit_tokens: a.prompt_cache_hit_tokens + b.prompt_cache_hit_tokens,
  prompt_cache_miss_tokens: a.prompt_cache_miss_tokens + b.prompt_cache_miss_tokens,
  completion_tokens: a.completion_tokens + b.completion_tokens,
});

export const costoEstimadoUsd = (uso: UsoTokens, horarioPico = false): number => {
  const precios = PRECIOS_DEEPSEEK_FLASH;
  const normal = (uso.prompt_cache_miss_tokens * precios.entradaSinCacheUsdPorM
    + uso.prompt_cache_hit_tokens * precios.entradaConCacheUsdPorM
    + uso.completion_tokens * precios.salidaUsdPorM) / 1_000_000;
  return Number((normal * (horarioPico ? precios.factorHorarioPico : 1)).toFixed(6));
};

/**
 * El horario pico de DeepSeek no está fijado en el código (por verificar): se configura con
 * `DEEPSEEK_PICO_UTC="HH:MM-HH:MM"` (puede cruzar la medianoche). Sin la variable, se asume horario normal.
 */
export const esHorarioPico = (fecha: Date, ventana: string | undefined): boolean => {
  const partes = ventana?.trim().match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!partes) return false;
  const [inicio, fin] = [Number(partes[1]) * 60 + Number(partes[2]), Number(partes[3]) * 60 + Number(partes[4])];
  const minuto = fecha.getUTCHours() * 60 + fecha.getUTCMinutes();
  return inicio <= fin ? minuto >= inicio && minuto < fin : minuto >= inicio || minuto < fin;
};
