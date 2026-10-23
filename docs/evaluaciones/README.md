# Evaluaciones del asistente

Reportes de `pnpm evaluar` (en `ai-proxy/`), uno por corrida: `AAAA-MM-DD-HHMM.md` en hora de Lima.
Cada reporte trae el resumen (aprobados por severidad, consistencia, latencia p50/p95, tokens con y sin caché
y costo), la tabla de casos y **todas** las respuestas con sus chequeos fallidos, para revisar el tono a mano.

- La evaluación es manual: llama a la API real de DeepSeek y gasta saldo. No corre en CI.
- La clave va en `ai-proxy/.env.local` (ignorado por git). Nunca aparece en los reportes.
- Si un reporte muestra fallos, no se cambia el prompt sin revisarlo antes con el autor
  ([D-001](../decisiones.md#d-001)).

Casos, chequeos y severidades: `ai-proxy/scripts/evaluacion/` (detalle en
[`ai-proxy/README.md`](../../ai-proxy/README.md#evaluación-contra-la-api-real)).
