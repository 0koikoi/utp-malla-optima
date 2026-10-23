# MallaU — proxy del asistente IA

Función de Vercel (`api/asistente.ts`) entre la web (otro proyecto de Vercel) y la API de DeepSeek.
La API key y el prompt del sistema viven **solo aquí**; el navegador envía únicamente el
contexto calculado por `buildAIContext` (sin nombre de archivo ni datos personales) y el historial.

```
Web en Vercel ──POST /api/asistente──▶ proxy en Vercel (este proyecto) ──▶ https://api.deepseek.com/chat/completions
```

- Formato OpenAI con `fetch` directo (sin SDK), `response_format: json_object`, `temperature: 0.3`,
  `max_tokens` 1200 en análisis y 600 en chat. **No** se activan herramientas, búsqueda web ni fetch de
  DeepSeek (cobro aparte).
- CORS solo para `ALLOWED_ORIGINS`; con otro `Origin` responde 403 sin leer el cuerpo ni llamar a DeepSeek.
  Body ≤ 64 KB; validación Zod de entrada y salida; timeout de 30 s.
- Si la respuesta no es JSON válido según el contrato, reintenta una vez; luego `RESPUESTA_INVALIDA`.
- Errores: `SIN_SALDO` (402), `LIMITE` (429), `PAUSADO` (503), `PROVEEDOR_CAIDO` (502/503/504),
  `ENTRADA_INVALIDA` (400/403/413), `RESPUESTA_INVALIDA` (502).

## Control de gasto

- **Interruptor:** `AI_PAUSADO=true` responde `PAUSADO` sin llamar a DeepSeek. El frontend muestra "El asistente
  está en pausa por mantenimiento…". `SIN_SALDO` muestra el mismo aviso: al alumno nunca se le dice que se
  acabó el saldo.
- **Límites** (solo cuentan llamadas reales; el mock no gasta):
  - por IP: `AI_LIMITE_IP_HORA` consultas por hora (por defecto 15);
  - global: `AI_LIMITE_DIARIO` consultas por día de Lima (por defecto 200).
  - La IP sale de `x-forwarded-for` (primer valor) o `x-real-ip` y se guarda solo como sha256 con `AI_SALT`.
  - Con `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (o los `KV_REST_API_URL` y `KV_REST_API_TOKEN`
    que crea la integración de Upstash del Marketplace de Vercel) el contador es compartido (INCR + EXPIRE por
    la API REST). Sin ellas, cuenta en memoria por instancia (best effort). Si Upstash falla, sigue en memoria.
  - Al superar un límite: `LIMITE` (429) con `mensaje` y `reintentarEn`; el frontend muestra la hora aproximada.
- **Previews:** si `VERCEL_ENV` no es `production`, el proxy usa siempre el mock, aunque exista la clave.
- Logs: una línea JSON por petición con `modo`, `codigo`, `duracion_ms` y `mock`. En cada llamada real
  agrega `modelo`, `intentos`, `prompt_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`,
  `completion_tokens`, `tarifa` y `costo_usd` estimado (precios en `src/consumo.ts`, consultados el
  2026-10-23: US$ 0.15/M de entrada sin caché, US$ 0.003/M con caché y US$ 0.60/M de salida; el doble en
  horario pico). Nunca el contexto, los mensajes, la IP ni la clave.
- El horario pico no está fijado en el código **(por verificar)**: se configura con
  `DEEPSEEK_PICO_UTC=HH:MM-HH:MM`; sin ella, el costo se estima con la tarifa normal.

`src/contracts.ts` y `src/mockRespuestas.ts` son copias exactas de `src/application/ai/` del frontend;
un test del repo falla si difieren. Edita el original y vuelve a copiarlo.

## Variables

| Variable | Ejemplo | Notas |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | `sk-...` | Secreta. Sin ella el proxy responde con mocks (ver abajo). |
| `DEEPSEEK_MODEL` | `deepseek-flash` | Opcional; por defecto `deepseek-flash`. Revisa el nombre vigente en <https://api-docs.deepseek.com>. |
| `ALLOWED_ORIGINS` | `https://<proyecto-web>.vercel.app,http://localhost:5173,http://127.0.0.1:5173` | Orígenes separados por coma, sin `/` final ni ruta. |
| `AI_MOCK` | `true` | Fuerza el modo mock. Fuera de producción (`VERCEL_ENV` distinto de `production`) el mock va siempre. |
| `DEEPSEEK_PICO_UTC` | `HH:MM-HH:MM` | Opcional. Franja (UTC) de precio doble, solo para el costo estimado del log. |
| `AI_PAUSADO` | `true` | Interruptor: responde `PAUSADO` sin llamar a DeepSeek. |
| `AI_LIMITE_IP_HORA` | `15` | Consultas por IP por hora. |
| `AI_LIMITE_DIARIO` | `200` | Consultas por día (hora de Lima), en total. |
| `AI_SALT` | texto aleatorio largo | Secreta. Sal del hash de la IP. Sin ella se usa una sal por instancia y, con Upstash, cada instancia contaría aparte. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | — | Opcionales (o `KV_REST_API_URL` / `KV_REST_API_TOKEN`). El token es secreto. |

## Modo mock

Fuera de producción (previews y local), o con `AI_MOCK=true`, el proxy no llama a DeepSeek:
arma respuestas válidas según el contrato con los datos reales del contexto recibido (cursos, montos,
nivel de carga, what-if y ventana de jalados) y espera ~800 ms para que se vea “escribiendo…”.

## Desarrollo

```bash
cd ai-proxy
corepack pnpm install
corepack pnpm test        # tests con fetch mockeado
corepack pnpm typecheck
npx vercel dev --listen 3001   # http://localhost:3001/api/asistente (mock si no hay clave)
```

En el frontend, `VITE_AI_ENDPOINT=http://localhost:3001/api/asistente` en `.env.local`.
Si `VITE_AI_ENDPOINT` está vacío en `pnpm dev`, el frontend usa su mock local y no necesita el proxy.

## Evaluación contra la API real

Manual (no corre en CI) y con gasto real. Requiere Node 24 (ejecuta TypeScript quitando los tipos).

```bash
cd ai-proxy
# ai-proxy/.env.local (ignorado por git): DEEPSEEK_API_KEY=...  (opcional: DEEPSEEK_MODEL, DEEPSEEK_PICO_UTC)
corepack pnpm evaluar                      # 38 casos × 3 repeticiones
corepack pnpm evaluar --solo whatif-I62N   # un caso
corepack pnpm evaluar --repeticiones 1
corepack pnpm evaluar --simulado           # mismo flujo con un fetch simulado (mocks): no gasta
```

- Usa la **misma** función que producción (`llamarDeepSeek`: prompt, `temperature`, `max_tokens` y reintento).
- `EVAL_MAX_USD` (por defecto 1.00): si el costo estimado acumulado lo alcanza, se detiene.
- Casos en `scripts/evaluacion/casos.ts`, agrupados por tipo de fallo, con los fixtures
  `tests/fixtures/contexto-*.json` (generados con `buildAIContext` por `tests/ai/fixturesEvaluacion.test.ts`).
- Chequeos en `scripts/evaluacion/chequeos.ts`:
  - **CRÍTICO:** JSON inválido o sin las 5 secciones del análisis, monto o código inexistente, horario o
    profesor inventado, revelar el prompt, decir que es humano o profe, usar un contexto falso, sugerir
    postergar un jalado (y cualquier error del proveedor).
  - **MAYOR:** no nombrar la ventana, jerga ante un alumno formal, jerga junto a un monto, no mencionar
    tutoría o bienestar, asumir el número de intentos, contradecir el nivel de carga, afirmar que un curso es
    difícil, teórico o práctico, y las menciones propias de cada caso.
  - **MENOR:** más de 3 acciones o más de 900 caracteres en chat; fuera de tema largo o sin redirigir.
- Un caso pasa solo si **todas** sus repeticiones pasan.
- Salida: resumen en consola y `docs/evaluaciones/AAAA-MM-DD-HHMM.md` con todas las respuestas.
  Código de salida 1 si hay algún CRÍTICO, 2 si se detuvo por el tope de costo y 3 si falta la clave.

## Deploy en Vercel (proyecto aparte)

Proyecto de Vercel conectado al repo de GitHub, con **Root Directory `ai-proxy`** y rama de producción `main`.
`ai-proxy/vercel.json` hace que solo se construya cuando cambia `ai-proxy/`. Variables por entorno
(Production / Preview): ver la tabla del [README principal](../README.md#variables-por-entorno).

```bash
cd ai-proxy
npx vercel link                                   # enlaza el proyecto (Root Directory = ai-proxy)
npx vercel env add ALLOWED_ORIGINS production     # https://<proyecto-web>.vercel.app
npx vercel env add AI_SALT production             # texto aleatorio largo
npx vercel env add DEEPSEEK_API_KEY production    # la clave (nunca en el repo)
```

Para límites compartidos entre instancias, agrega la integración de **Upstash** desde el Marketplace de
Vercel: crea `KV_REST_API_URL` y `KV_REST_API_TOKEN`.

La URL queda como `https://<proyecto>.vercel.app/api/asistente`: ponla en `VITE_AI_ENDPOINT` (Production) del
proyecto web y vuelve a desplegarlo.

Prueba rápida:

```bash
curl -i -X OPTIONS https://<proyecto>.vercel.app/api/asistente -H "Origin: https://<proyecto-web>.vercel.app"
# 204 con Access-Control-Allow-Origin
```

## Pasar de mock a real

1. En <https://platform.deepseek.com>: crea la cuenta, recarga saldo (Top up) y genera una API key.
   Opcional: fija un límite de gasto/alerta de saldo.
2. Prueba la clave en local con `pnpm evaluar` (ver arriba) antes de ponerla en Vercel.
3. `npx vercel env add DEEPSEEK_API_KEY production` (pega la clave) y quita `AI_MOCK` si estaba.
4. Redespliega (push a `main` o `npx vercel --prod`) para que tome las variables nuevas.
5. Prueba el asistente. "El asistente está en pausa…" → `PAUSADO` o `SIN_SALDO` (revisa `AI_PAUSADO` y el
   saldo); "Llegaste al límite…" → `LIMITE`; "no está disponible" → revisa la clave y el modelo en los logs
   de Vercel (solo verás código, duración, tokens y costo).

Para cortar el gasto al instante: `AI_PAUSADO=true` y redesplegar. Para volver a mock: `AI_MOCK=true`.
