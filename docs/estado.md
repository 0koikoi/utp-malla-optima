Última actualización: 2026-10-23

# Estado del proyecto

Foto al 2026-10-23, rama `feat/ia-real` (desde `origin/main`). Lo que no se pudo confirmar en el código o en
git está marcado **(por verificar)**.

## Qué funciona

- **Malla y planificación:**
  - Importa el Excel de avance de la UTP (72 cursos con el fixture real).
  - Contexto académico por mes de ingreso y ciclo actual.
  - Arrastre (o toque en celular) de cursos a ciclos y veranos, con validación de prerrequisitos
    ([D-009](decisiones.md#d-009)).
  - Planificador automático ("Estrategia") con vista previa.
  - Ciclos pasados con horas y créditos llevados; contadores de avance.
- **Jalados:**
  - Marcar como jalado desde el menú (i), con vista previa de `simularJalado` y Deshacer.
  - Ventana de recuperación según el calendario ([D-015](decisiones.md#d-015)), avisos y bloqueo de los
    periodos posteriores.
- **Finanzas:**
  - Tarifario 2026 de Ate con escala de pensión, recargo por hora adicional, 3 métodos de pago y pago único.
  - Los periodos bloqueados no se cotizan ([D-010](decisiones.md#d-010)).
- **Otros:** exportes a PNG y PDF, respaldo JSON (exportar e importar), PWA, modo oscuro y tutorial.
- **Asistente IA:**
  - Botón flotante con saludo, aviso de privacidad y análisis del plan en tarjetas.
  - Preguntas rápidas (😊) y foco en el plan, un ciclo o un curso (📎).
  - Estado sin conexión, errores con Reintentar y what-if con la ventana concreta.
  - Prompt del asesor con persona, glosario y jerga como espejo ([D-022](decisiones.md#d-022) a
    [D-024](decisiones.md#d-024)).
  - Proxy con control de gasto ([D-025](decisiones.md#d-025)) y registro de consumo
    ([D-026](decisiones.md#d-026)).
  - Razonamiento de DeepSeek desactivado, `max_tokens` 900/1800 y un reintento si se corta
    ([D-031](decisiones.md#d-031)).
  - `CONTEXTO.derivados` con restas y totales ya calculados ([D-032](decisiones.md#d-032)); el contexto va en un
    mensaje del sistema entre delimitadores ([D-033](decisiones.md#d-033)).
  - Filtro de salida: cada respuesta real se verifica contra el contexto, con una regeneración y una respuesta
    segura fija ([D-034](decisiones.md#d-034)); el análisis exige 5 secciones en orden ([D-035](decisiones.md#d-035)).
  - Pago único sin cuota mensual: se paga todo al inicio, en el asistente y en la Simulación de cuotas
    ([D-037](decisiones.md#d-037)); horas sin cada curso en `derivados` ([D-036](decisiones.md#d-036)).

## De mock a real

- **Producción** (`VERCEL_ENV=production`) llama a DeepSeek con `DEEPSEEK_API_KEY`. Sin clave responde
  `PROVEEDOR_CAIDO`, salvo con `AI_MOCK=true`.
- **Previews y local:** el proxy usa siempre el mock, aunque haya clave. La web en preview usa
  `VITE_AI_MOCK=true` (`MockAIClient`, cabecera "En línea · demo"). En `pnpm dev` sin `VITE_AI_ENDPOINT`,
  también mock local.
- **Pruebas con la API real:** solo con `pnpm evaluar` ([D-027](decisiones.md#d-027)), con la clave en
  `ai-proxy/.env.local` (ignorado por git). Corridas del 2026-10-23 en `docs/evaluaciones/`:

  | Corrida | Casos | Repeticiones | CRÍTICOS | p95 | Costo |
  | --- | --- | --- | --- | --- | --- |
  | Primera (`2026-10-23-1731.md`) | 16/38 | 51 % | 56 | 14.1 s | US$ 0.0723 |
  | Segunda (`2026-10-23-1841.md`) | 23/42 | 63.5 % | 8 | 4.0 s | US$ 0.0267 |
  | Tercera (`2026-10-23-1922.md`) | 28/43 | 72.1 % | 5 (0 recalculado) | 4.8 s | US$ 0.0298 |

- **Criterios de aprobación** ([D-038](decisiones.md#d-038)): 0 CRÍTICOS, ≥ 95 % de repeticiones sin CRÍTICO ni
  MAYOR, MENOR en ≤ 10 %, seguras ≤ 3 %, p95 < 6 s en chat y < 10 s en análisis. **No se cumplen** todavía. En la
  tercera corrida, recalculada con el chequeo de pago único corregido: 0 CRÍTICOS (cumple), 94.6 % sin CRÍTICO ni
  MAYOR (falla por poco: el jalado y la bika, [F-034](fallos.md#f-034)) y MENOR en 21.7 % (falla: la carga,
  [F-030](fallos.md#f-030)). Seguras 0 % y latencia (chat 2.1 s, análisis 5.7 s) cumplen.
- Las propuestas de cambio al prompt y al contrato están en la [bitácora](bitacora.md); no se aplican sin el autor.
  Recomendación: no activar la clave en producción hasta cumplirlos (la decisión es del autor).

## Tests

| Proyecto | Archivos | Tests | Comando |
| --- | --- | --- | --- |
| Frontend (`tests/`) | 39 | 328 | `pnpm vitest run --exclude 'ai-proxy/**'` |
| Proxy (`ai-proxy/tests/`) | 7 | 134 | `cd ai-proxy && pnpm test` |
| Todo (raíz) | 46 | 462 | `pnpm test` (Vitest también recoge `ai-proxy/tests`) |

Además: `pnpm lint`, `pnpm build`, `pnpm verify:base` y `cd ai-proxy && pnpm typecheck`. Correr `pnpm test`
dos veces seguidas deja `git status` limpio ([F-026](fallos.md#f-026)).

## Ramas y PRs

| Rama | Último commit | Estado |
| --- | --- | --- |
| `feat/ia-real` | prompt, control de gasto, evaluación, migración a Vercel, evaluación real, derivados y filtro de salida | sin PR, sin push |
| `main` (`origin/main`) | `9cbfd8e` (merge del PR #10) | forzada a `b/final1` ([D-029](decisiones.md#d-029)) |
| `b/final1` (`origin/b/final1`) | `9cbfd8e` | igual que `main` |
| tag `respaldo/main-antes-de-force` | `90962be` (merge del PR #1) | respaldo de `main` antes del push forzado |

PRs en GitHub (`gh pr list`):

- #7, #11, #9 y #10 → `b/final1`: caracterización, bugs, jalados y asistente IA; fusionados el 2026-10-23.
- #12 `b/final1` → `dev`: fusionado el 2026-10-23.
- #6 `dev` → `main`: cerrado sin fusionar.
- #3, #4 y #5 → `dev`: fusionados el 2026-10-23. #8: cerrado.
- #1 `feature/implementacion-ia` → `main`: fusionado el 2026-10-23 (su estado quedó en el tag de respaldo).

## Entornos (solo Vercel)

| Entorno | Web | Proxy |
| --- | --- | --- |
| Production (rama `main`) | base `/`, `VITE_AI_ENDPOINT` al proxy | DeepSeek real con control de gasto |
| Preview (PRs) | `VITE_AI_MOCK=true`: mock local | siempre mock (`VERCEL_ENV=preview`) |
| Local | `pnpm dev`: mock sin `VITE_AI_ENDPOINT` | `vercel dev`: mock |

Variables completas por entorno: [README](../README.md#variables-por-entorno) ([D-028](decisiones.md#d-028)).
Que los dos proyectos ya estén creados y conectados en Vercel está **(por verificar)**: no consta en el repo.
Las URLs reales de Vercel no se registran aquí. GitHub Pages ya no se usa ([D-003](decisiones.md#d-003)
reemplazada).

## Pasos para pasar a real

1. En la consola de DeepSeek: recargar saldo en platform.deepseek.com/top_up (mínimo US$ 2.00 + 6 % de
   impuesto = US$ 2.12; puede tardar de 24 a 72 h en acreditarse) y generar una API key. Opcional: alerta de
   gasto. Ver [D-005](decisiones.md#d-005).
2. Crear `ai-proxy/.env.local` con `DEEPSEEK_API_KEY=...` (ignorado por git) y correr
   `cd ai-proxy && corepack pnpm evaluar`. Revisar el reporte en `docs/evaluaciones/` y que se cumplan los
   criterios de aprobación ([D-034](decisiones.md#d-034)).
3. En el proyecto del proxy (Production): `DEEPSEEK_API_KEY`, `ALLOWED_ORIGINS`, `AI_SALT` y, si se quiere un
   contador compartido, la integración de Upstash (`KV_REST_API_URL`, `KV_REST_API_TOKEN`).
4. En el proyecto web (Production): `VITE_AI_ENDPOINT`; en Preview: `VITE_AI_MOCK=true`.
5. Push a `main` (o `npx vercel --prod`) para que tomen las variables.
6. Revisar los logs: una línea por consulta con tokens y `costo_usd`. Para cortar el gasto: `AI_PAUSADO=true`.

Detalle en [`ai-proxy/README.md`](../ai-proxy/README.md).

## Preguntas abiertas para confirmar con la UTP

| Pregunta | Qué hace hoy el código |
| --- | --- |
| Texto exacto del estado de un jalado en el Excel | `ESTADOS_EXCEL_JALADO = ['DESAPROBADO']` ([D-013](decisiones.md#d-013)) |
| ¿El descuento bancario aplica sobre el recargo por horas extra? | **Sí se aplica**: `cuotaBase` incluye el recargo y el descuento se calcula sobre ella (`budgetCalculator.ts`) ([F-021](fallos.md#f-021)) |
| ¿Los S/ 45 del programa de salud entran al total? | **No entran**: `costoProgramaSaludEstudiantil` (45) se carga en la configuración pero ningún cálculo lo suma |
| ¿El verano para recuperar un jalado es opcional u obligatorio? | Se asume **opcional**: la ventana acepta el verano o el ciclo siguiente |
| Áreas reales de los electivos | `electivosAreas.json` con 4 áreas propuestas por nombre y `"confirmado": false` |
| `recargoRepitenciaPorcentaje` | Vale 0 en `ate.json` y ningún cálculo lo usa |
| ¿Cómo aplica la UTP el art. 102 de la Ley 30220 (tercera y cuarta desaprobación)? | El asistente cita la ley y deriva al tutor o a Servicios Académicos ([D-024](decisiones.md#d-024)) |

Otro dato abierto: la franja del horario pico de DeepSeek (precio doble) **(por verificar)**; se configura con
`DEEPSEEK_PICO_UTC` ([D-026](decisiones.md#d-026)).

## Próximos pasos

1. Revisar con el autor las propuestas de la corrida 3 en la [bitácora](bitacora.md) (carga, jalado primero, bika
   con un jalado y créditos para egresar) y volver a correr `pnpm evaluar` hasta cumplir los criterios.
2. Crear y conectar los dos proyectos de Vercel con las variables por entorno; agregar Upstash.
3. Abrir el PR de `feat/ia-real` hacia `main`.
4. Resolver las preguntas abiertas con la UTP.
5. Atender los fallos pendientes de [fallos.md](fallos.md), empezando por el tarifario guardado que tapa el
   JSON ([F-015](fallos.md#f-015)) y los íconos de la PWA ([F-019](fallos.md#f-019)).
