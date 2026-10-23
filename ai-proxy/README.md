# MallaU — proxy del asistente IA

Función de Vercel (`api/asistente.ts`) entre el frontend (GitHub Pages) y la API de DeepSeek.
La API key y el prompt del sistema viven **solo aquí**; el navegador envía únicamente el
contexto calculado por `buildAIContext` (sin nombre de archivo ni datos personales) y el historial.

```
GitHub Pages ──POST /api/asistente──▶ Vercel (este proyecto) ──▶ https://api.deepseek.com/chat/completions
```

- Formato OpenAI con `fetch` directo (sin SDK), `response_format: json_object`, `temperature: 0.3`,
  `max_tokens: 1200`. **No** se activan herramientas, búsqueda web ni fetch de DeepSeek (cobro aparte).
- CORS solo para `ALLOWED_ORIGINS`; body ≤ 64 KB; validación Zod de entrada y salida; timeout de 30 s.
- Si la respuesta no es JSON válido según el contrato, reintenta una vez; luego `RESPUESTA_INVALIDA`.
- Errores: `SIN_SALDO` (402), `LIMITE` (429), `PROVEEDOR_CAIDO` (502/503/504), `ENTRADA_INVALIDA` (400/403/413),
  `RESPUESTA_INVALIDA` (502).
- Los logs solo tienen `resultado`, `modo`, `ms` y `mock`: nunca el contexto ni los mensajes.

`src/contracts.ts` y `src/mockRespuestas.ts` son copias exactas de `src/application/ai/` del frontend;
un test del repo falla si difieren. Edita el original y vuelve a copiarlo.

## Variables

| Variable | Ejemplo | Notas |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | `sk-...` | Secreta. Sin ella el proxy responde con mocks (ver abajo). |
| `DEEPSEEK_MODEL` | `deepseek-flash` | Opcional; por defecto `deepseek-flash`. Revisa el nombre vigente en <https://api-docs.deepseek.com>. |
| `ALLOWED_ORIGINS` | `https://<usuario>.github.io,http://localhost:5173,http://127.0.0.1:5173` | Orígenes separados por coma, sin `/` final ni ruta. |
| `AI_MOCK` | `true` | Fuerza el modo mock. En producción, sin clave, el mock **solo** se activa con `AI_MOCK=true`. |

## Modo mock

Sin `DEEPSEEK_API_KEY` (y fuera de producción), o con `AI_MOCK=true`, el proxy no llama a DeepSeek:
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

## Deploy en Vercel (proyecto aparte)

```bash
cd ai-proxy
npx vercel link                 # crea/enlaza el proyecto; en el dashboard: Root Directory = ai-proxy
npx vercel env add ALLOWED_ORIGINS production   # https://<usuario>.github.io
npx vercel env add AI_MOCK production           # true (mientras no haya clave)
npx vercel env add DEEPSEEK_MODEL production    # deepseek-flash (opcional)
npx vercel --prod
```

Si enlazas desde la raíz del repo, en **Settings → Build and Deployment → Root Directory** pon `ai-proxy`.
La URL queda como `https://<proyecto>.vercel.app/api/asistente`. Ponla en GitHub:
**Settings → Secrets and variables → Actions → Variables → `VITE_AI_ENDPOINT`** y vuelve a desplegar el frontend.

Prueba rápida:

```bash
curl -i -X OPTIONS https://<proyecto>.vercel.app/api/asistente -H "Origin: https://<usuario>.github.io"
# 204 con Access-Control-Allow-Origin
```

## Pasar de mock a real

1. En <https://platform.deepseek.com>: crea la cuenta, recarga saldo (Top up) y genera una API key.
   Opcional: fija un límite de gasto/alerta de saldo.
2. `npx vercel env add DEEPSEEK_API_KEY production` (pega la clave).
3. `npx vercel env rm AI_MOCK production` (o cámbiala a `false`).
4. `npx vercel --prod` para que el deploy tome las variables nuevas.
5. Prueba el asistente. Si ves “El servicio de IA no tiene saldo” → `SIN_SALDO` (recarga);
   “Hay muchas consultas” → `LIMITE` (espera); “no está disponible” → revisa la clave y el modelo
   en los logs de Vercel (solo verás el código de error y la duración).

Para volver a mock basta con `AI_MOCK=true` y un nuevo `vercel --prod`.
