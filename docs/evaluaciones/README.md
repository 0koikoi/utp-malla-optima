# Evaluaciones del asistente

Reportes de `pnpm evaluar` (en `ai-proxy/`), uno por corrida: `AAAA-MM-DD-HHMM.md` en hora de Lima.
Cada reporte trae el resumen (aprobados por severidad, consistencia, latencia p50/p95 y por modo, filtro de
salida, tokens con y sin caché, costo y criterios de aprobación), la tabla de casos y **todas** las respuestas con
sus chequeos fallidos y cada intento crudo (`finish_reason`, `usage`, razonamiento), para revisar el tono a mano.

| Reporte | Qué es |
| --- | --- |
| `2026-10-23-1731.md` | Primera corrida real (38 casos × 3), con el razonamiento activado: 16/38 casos. |
| `2026-10-23-1807-contrato-analisis-plan1.md`, `2026-10-23-1808-montos-800.md` | Diagnóstico por intento ([F-027](../fallos.md#f-027)). |
| `2026-10-23-1813-*-sin-razonamiento.md` | Verificación con `thinking` desactivado. |
| `2026-10-23-1841.md` | Corrida completa después de los cambios (42 casos × 3): 23/42 casos. |
| `2026-10-23-1922.md` | Corrida 3 (43 casos × 3): 28/43 casos. Sus 5 CRÍTICOS `pago-unico-mensual` eran falsos positivos (ver la bitácora). |
| `2026-10-23-2006.md` | Corrida 4 (44 casos × 3): 33/44 casos, 0 CRÍTICOS. 7 repeticiones con falsos positivos, recalculadas en la bitácora. |

- La evaluación es manual: llama a la API real de DeepSeek y gasta saldo. No corre en CI.
- La clave va en `ai-proxy/.env.local` (ignorado por git). Nunca aparece en los reportes.
- Si un reporte muestra fallos, no se cambia el prompt sin revisarlo antes con el autor
  ([D-001](../decisiones.md#d-001)).

Casos, chequeos y severidades: `ai-proxy/scripts/evaluacion/` (detalle en
[`ai-proxy/README.md`](../../ai-proxy/README.md#evaluación-contra-la-api-real)).
