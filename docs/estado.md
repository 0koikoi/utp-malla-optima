Última actualización: 2026-10-23

# Estado del proyecto

Foto al 2026-10-23, rama `feat/ia-asistente`. Lo que no se pudo confirmar en el código o en git está marcado
**(por verificar)**.

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
- **Asistente IA (UI completa):**
  - Botón flotante con saludo, aviso de privacidad y análisis del plan en tarjetas.
  - Preguntas rápidas (😊) y foco en el plan, un ciclo o un curso (📎).
  - Estado sin conexión, errores con Reintentar y what-if con la ventana concreta.

## Qué está en mock

- **Las respuestas del asistente.** No hay clave de DeepSeek ([D-007](decisiones.md#d-007)):
  - el proxy responde en mock si no tiene `DEEPSEEK_API_KEY` (en producción solo con `AI_MOCK=true`);
  - en `pnpm dev` sin `VITE_AI_ENDPOINT`, el cliente usa `MockAIClient`.

  Los mocks usan los datos reales del contexto (montos, carga, what-if y ventana), pero el texto es fijo.
- La integración real con DeepSeek está implementada y probada con `fetch` simulado, pero **nunca se probó
  contra la API real** (no hay clave).

## Tests

| Proyecto | Archivos | Tests | Comando |
| --- | --- | --- | --- |
| Frontend (`tests/`) | 37 | 306 | `pnpm vitest run --exclude 'ai-proxy/**'` |
| Proxy (`ai-proxy/tests/`) | 2 | 35 | `cd ai-proxy && pnpm test` |
| Todo (raíz) | 39 | 341 | `pnpm test` (Vitest también recoge `ai-proxy/tests`) |

Además: `pnpm lint`, `pnpm build`, `pnpm verify:base` (los dos builds) y `cd ai-proxy && pnpm typecheck`.

## Ramas y PRs

| Rama local | Último commit | Estado |
| --- | --- | --- |
| `feat/ia-asistente` | asistente IA, pulido A1–A2, demo B1–B3 y estos docs | sin PR, sin push |
| `pr/3-jalados` | `5de2a02` | PR #5 → `dev`, fusionado el 2026-10-23 |
| `pr/2-bugs` | `acef637` | PR #4 → `dev`, fusionado el 2026-10-23 |
| `pr/1-caracterizacion` / `test/caracterizacion` | `aebf8de` | PR #3 → `dev`, fusionado el 2026-10-23 |
| `fix/pre-ia` | `5de2a02` | mismo commit que `pr/3-jalados` |
| `backup/fix-pre-ia` | `597d631` | respaldo intermedio de los jalados |
| `b/final1` | `f982f4c` (2026-10-11) | base desde la que se trabajó |

PRs en GitHub (`gh pr list`):

- #6 `dev` → `main`: abierto.
- #1 `feature/implementacion-ia` → `main`: fusionado el 2026-10-23.
- #2 `feature/implementacion-ia` → `feat/react-migration-zully`: fusionado el 2026-09-30.

Que `main` contenga la arquitectura mock de `feature/implementacion-ia` y cómo se resolverá con #6 está
**(por verificar)**.

## Entornos

| Entorno | Qué es | Estado |
| --- | --- | --- |
| GitHub Pages | Web en `/utp-malla-optima/`, se publica con cada push a `dev` ([D-003](decisiones.md#d-003)) | activo; recibirá `VITE_AI_ENDPOINT` cuando se defina la variable de Actions |
| Proxy en Vercel | Proyecto con Root Directory `ai-proxy` ([D-002](decisiones.md#d-002)) | **(por verificar)**: no consta en el repo que esté desplegado |
| Demo en Vercel | Proyecto con Root Directory raíz y `VITE_BASE=/` ([D-004](decisiones.md#d-004)) | **(por verificar)**: no consta que esté desplegada |

Las URLs reales de Vercel no se registran aquí.

## Pasos para pasar de mock a real

1. En la consola de DeepSeek: crear la cuenta, recargar saldo (mínimo US$ 2 + 6 % de impuesto,
   **(por verificar)**) y generar una API key. Opcional: alerta de gasto.
2. En el proyecto del proxy: `npx vercel env add DEEPSEEK_API_KEY production`.
3. Quitar el mock: `npx vercel env rm AI_MOCK production` (o ponerlo en `false`).
4. Opcional: `DEEPSEEK_MODEL` (por defecto `deepseek-flash`; revisar el nombre vigente).
5. `npx vercel --prod`.
6. Probar el asistente. Si aparece `SIN_SALDO`, recargar; si aparece `PROVEEDOR_CAIDO`, revisar la clave y el
   modelo en los logs de Vercel (solo muestran código y duración).

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

## Próximos pasos

1. Abrir el PR de `feat/ia-asistente` (apilado sobre `pr/3-jalados`) y revisarlo.
2. Desplegar el proxy en Vercel en mock (`AI_MOCK=true`), definir `VITE_AI_ENDPOINT` en Actions y crear la
   demo con `VITE_BASE=/`; agregar sus dominios a `ALLOWED_ORIGINS`.
3. Resolver las preguntas abiertas con la UTP.
4. Cuando haya saldo, pasar a real y probar con la API.
5. Atender los fallos pendientes de [fallos.md](fallos.md), empezando por el tarifario guardado que tapa el
   JSON ([F-015](fallos.md#f-015)) y los íconos de la PWA ([F-019](fallos.md#f-019)).
