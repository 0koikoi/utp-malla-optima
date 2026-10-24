Última actualización: 2026-10-23

# Bitácora

Registro cronológico, del más reciente al más antiguo. Fechas y hashes tomados de `git log` de las ramas
locales. Lo que no se pudo confirmar en git o en el código está marcado **(por verificar)**.
Plantilla: [plantillas.md](plantillas.md#entrada-de-bitácora).

---

## 2026-10-23 · Corrida 5: monto del alumno como presupuesto, nombres internos y criterios cumplidos

- **Qué se hizo:**
  - `aplicarMontoDelAlumno` en `presupuesto.ts` (compartido con el proxy): el monto del último mensaje es el
    presupuesto de esa pregunta, con las diferencias recalculadas ([D-043](decisiones.md#d-043),
    [F-037](fallos.md#f-037)). Se quita la excepción del filtro para montos del mensaje.
  - Filtro de salida: nombres internos y respuestas a la corrección; el mensaje de corrección pide reescribir para el
    alumno ([D-044](decisiones.md#d-044), [F-036](fallos.md#f-036)).
  - Prompt (autorizado): reglas 7 y 10 sin el total ni el nivel de carga, regla 8 con 100 palabras en bika y trika
    ([D-045](decisiones.md#d-045)) y regla 1 con el monto del alumno. Huella `dbf6a3d1…`.
  - Evaluación: `repite-carga` con las cifras de `proximoPeriodoConJalados` si se nombra el jalado, `chat-largo` de
    100 en bika y trika, `montos-800` sin "900", MAYOR `presupuesto-mezclado` y `nombre-interno`, caso
    `montos-1000-tras-800` (45 casos).
- **Por qué:** propuestas 1 a 4 de la corrida 2006 y el hallazgo del autor sobre `montos-800`.
- **Rama / PR:** `feat/ia-real` (sin PR, sin push).
- **Commits:** `ee81660` (1), `6a15358` (2), `c702cc9` (3), `b2c1a79` (4, con el reporte) y este de docs (5).
- **Resultados (corrida 5, `docs/evaluaciones/2026-10-23-2054.md`, 45 casos × 3), tal como salió, sin recalcular:**

  | Corrida | Casos | CRÍTICO · MAYOR · MENOR | Sin CRÍTICO ni MAYOR | Con MENOR | Seguras | p95 chat / análisis | Costo |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 2006 (recalculada) | 33/44 | 0 · 1 · 14 | 99.2 % | 10.6 % | 0.8 % | 2.2 s / 6.0 s | US$ 0.0295 |
  | 2054 | 38/45 | 0 · 2 · 11 | 98.5 % | 8.1 % | 0 % | 2.2 s / 5.5 s | US$ 0.0306 |

  - **Criterios de D-038: se cumplen todos.** ✓ 0 CRÍTICOS · ✓ 98.5 % sin CRÍTICO ni MAYOR (133/135) · ✓ MENOR en
    8.1 % (11/135) · ✓ seguras 0 % · ✓ p95 chat 2 205 ms · ✓ p95 análisis 5 503 ms.
  - Filtro de salida: 133 a la primera y 2 regeneradas (en `montos-1000-tras-800`, la primera respuesta decía "Con S/
    800…", que ya no está en el contexto; la regenerada usa solo S/ 1,000).
  - Los 2 MAYOR son falsos positivos de los casos, en contra del resultado: "lo aprobaste" (`cursos-convalide-calculo-ii`
    pide /aprobad/) y "tu ciclo actual es el 7" (`incoherente-cachimbo` pide "ciclo 7"). No se corrigieron.
  - Los 11 MENOR son `repite-carga` ([F-030](fallos.md#f-030)): el modelo sigue citando 25 h o "7 cursos" en sin datos,
    bienestar y fuera de tema, por debajo del umbral del 10 %.
  - Costo acumulado del día: US$ 0.1694 + US$ 0.0306 = US$ 0.2000 estimado.
- **Pendiente (no bloquea):** ampliar las dos regex de los falsos positivos; en `repite-carga`, no contar
  "sobrecargarte" cuando la pregunta es de un jalado; seguir bajando `repite-carga` (F-030).
- **Verificación:**
  - `pnpm test` (476), `pnpm lint`, `pnpm build` y en `ai-proxy/` `pnpm test` (142) y `pnpm typecheck` en verde
    después de cada commit. `pnpm evaluar --simulado`: 45/45 y todos los criterios.
  - La clave nunca se leyó ni se imprimió; el reporte no la contiene.

## 2026-10-23 · Corrida 4: jalado en el próximo periodo, carga con excepciones y bika con jalado

- **Qué se hizo:**
  - `derivados.proximoPeriodoConJalados` y `derivados.planificadosBloqueadosPorJalado` ([D-040](decisiones.md#d-040),
    [F-035](fallos.md#f-035)).
  - `perfil.creditos.pendientes` → `pendientesEnMalla` ([D-041](decisiones.md#d-041)).
  - Prompt (autorizado): carga con excepciones ([D-039](decisiones.md#d-039)), jalado primero (regla 3), bika con
    jalado (regla 8), créditos para egresar (regla 1) y ejemplo de tono 6 ([D-042](decisiones.md#d-042)). Huella
    `6bead691…`.
  - Evaluación: excepciones de `repite-carga`, `jalado-proximo-ciclo` con cifras de `proximoPeriodoConJalados`, caso
    `trika-herramientas` (44 casos) y `creditos-faltantes` en `incoherente-cachimbo`. Criterios de D-038.
- **Por qué:** propuestas 1, 2, 3 y 5 de la corrida 1922, aceptadas por el autor con ajustes.
- **Rama / PR:** `feat/ia-real` (sin PR, sin push).
- **Commits:** `b4a6a0f` (1), `019b1ce` (2), `f444d6b` (3), `61dfdc7` (4, con el reporte) y este de docs (5).
- **Resultados (corrida 4, `docs/evaluaciones/2026-10-23-2006.md`, 44 casos × 3):**

  | Corrida | Casos | CRÍTICO · MAYOR · MENOR | Sin CRÍTICO ni MAYOR | Con MENOR | Seguras | p95 chat / análisis | Costo |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 1922 (recalculada) | 28/43 | 0 · 16 · 28 | 94.6 % | 21.7 % | 0 % | 2.1 s / 5.7 s | US$ 0.0298 |
  | 2006 tal como salió | 33/44 | 0 · 8 · 14 | 93.9 % | 10.6 % | 0.8 % | 2.2 s / 6.0 s | US$ 0.0295 |
  | 2006 recalculada | — | 0 · 1 · 14 | 99.2 % | 10.6 % | 0.8 % | igual | — |

  - Criterios (recalculada): ✓ 0 CRÍTICOS · ✓ ≥ 95 % sin CRÍTICO ni MAYOR (99.2 %) · ✗ MENOR en ≤ 10 % (10.6 %:
    14 de 132; con 13 cumpliría) · ✓ seguras ≤ 3 % (0.8 %) · ✓ p95 chat (2 242 ms) · ✓ p95 análisis (6 028 ms).
  - Falsos positivos corregidos después de la corrida, con las frases reales como test: "eso bloquea los demás
    cursos" y "va primero" / "es clave" (casos), "estás cargado" y "estás pasado" (`contradice-carga`), y en el
    filtro de salida "sacar X te deja en 23 h" (se atribuía al curso y regeneró una respuesta correcta). El
    recálculo vuelve a aplicar el filtro y los chequeos a los intentos guardados en el reporte, sin llamar a la API:
    solo cambian esas 7 repeticiones; las otras 125 dan los mismos fallos.
  - Filtro de salida: 127 a la primera, 4 regeneradas (3 por montos, 2 por atributos de curso; una de estas era el
    falso positivo) y 1 respuesta segura (`montos-800`: "te faltarían S/ 84.86", una resta del modelo).
  - MENOR que quedan (14): `repite-carga` 11 citando cifras (`sin-datos-tranca` 3, `bienestar-estres` 3,
    `bienestar-dejar` 2, `jalado-postergar` 2 con las 29 h de `proximoPeriodoConJalados`, `jerga-yuca` 1) y
    `chat-largo` 3 (`trika-herramientas`, 83 a 88 palabras con todo lo que pide la regla 8).
  - Costo acumulado del día: US$ 0.1399 + US$ 0.0295 = US$ 0.1694 estimado.
- **Propuestas (no aplicadas):**
  1. `jalado-postergar` (2 MENOR): la pregunta es sobre un jalado y las 29 h salen de `proximoPeriodoConJalados`,
     como pide la regla 3. Proponer que `repite-carga` acepte cifras de `proximoPeriodoConJalados` cuando la
     pregunta nombra un curso jalado. Con eso, MENOR en 9.1 % (12/132) y la corrida cumpliría todo.
  2. Trika (3 MENOR): la regla 8 pide cinco cosas más lo propio de la trika; no entran en 80 palabras. Proponer
     hasta 100 palabras para bika y trika (prompt y chequeo) o acortar el texto de la trika en la regla 8.
  3. Carga con cifras en sin datos y bienestar (8 MENOR): la regla 7 aún dice "ofrece lo que sí puedes: las horas de
     cada curso…" y el modelo da el total del periodo. Proponer en la regla 7 "sin dar el total de horas del
     periodo", y en la regla 10 "lo práctico, sin cifras".
  4. Regeneraciones (F-036): cambiar `mensajeCorreccion` para terminar con "Escribe de nuevo tu respuesta para el
     alumno, como si fuera la primera: no menciones esta corrección, CONTEXTO ni nombres de campos", y que el filtro
     de salida marque nombres de campos ("CONTEXTO.", "derivados.") como el chequeo de delimitadores.
  5. `montos-800` (1 segura): el modelo calcula "te faltarían S/ 84.86" con un monto del alumno, como hace el
     ejemplo 3 ("Con S/ 700 al mes te faltarían S/ 42.10"). Decidir si el ejemplo 3 debe dejar esa resta (el filtro
     la bloquea porque 42.10 no saldría de CONTEXTO) o decir solo "no te alcanza: la cuota más baja es S/ 742.10".
- **Verificación:**
  - `pnpm test` (466), `pnpm lint`, `pnpm build` y en `ai-proxy/` `pnpm test` (137) y `pnpm typecheck` en verde
    después de cada commit. `pnpm evaluar --simulado`: 44/44 y todos los criterios.
  - La clave nunca se leyó ni se imprimió; el reporte no la contiene.

## 2026-10-23 · Corrida 3: pago único sin cuota mensual, 5 secciones obligatorias y horas sin cada curso

- **Qué se hizo:**
  - Pago único: sin cuota mensual en el contexto, `derivados.pagoUnico` y la Simulación de cuotas dice que se paga
    una sola vez al inicio ([D-037](decisiones.md#d-037), [F-033](fallos.md#f-033)).
  - Prompt (autorizado): pago único en la regla 1, electivos en créditos, reglas 7 y 14, ejemplo 2 sin "no te
    pases de carga", 5 secciones en orden, ejemplo 3 reemplazado y ejemplo 5 nuevo. Huella `bb4686d8…`.
  - Contrato del análisis con 5 secciones en orden; el filtro de salida regenera si no ([D-035](decisiones.md#d-035)).
  - `derivados.horasSinCadaCurso` y `derivados.creditosElectivosFaltantes` ([D-036](decisiones.md#d-036)).
  - Evaluación: chequeos CRÍTICOS `pago-unico-mensual` y `electivos-como-cursos`, caso `montos-pago-unico-900`
    (43 casos), `bika-inteligencia` con el fixture del jalado y criterios nuevos ([D-038](decisiones.md#d-038)).
- **Por qué:** propuestas 1 a 5 de la corrida 1841, aceptadas por el autor con ajustes, y el error de datos del
  pago único.
- **Rama / PR:** `feat/ia-real` (sin PR, sin push).
- **Commits:** `a425a31` (1), `c5aab81` (2), `94c3334` (3), `3cf0d8a` (4), `2c23a8d` (5), `2d1191b` (6, con el
  reporte) y este de docs (7).
- **Resultados (corrida 3, `docs/evaluaciones/2026-10-23-1922.md`, 43 casos × 3):**

  | Corrida | Casos | CRÍTICO · MAYOR · MENOR | p95 chat / análisis | Filtro (primera · regenerada · segura) | Costo |
  | --- | --- | --- | --- | --- | --- |
  | 1731 (38 × 3) | 16/38 | 56 · 1 · 1 | 14.1 s (total) | — | US$ 0.0723 |
  | 1841 (42 × 3) | 23/42 | 8 · 17 · 31 | 2.2 s / 5.3 s | 123 · 3 · 0 | US$ 0.0267 |
  | 1922 (43 × 3) | 28/43 | 5 · 16 · 28 | 2.1 s / 5.7 s | 125 · 4 · 0 | US$ 0.0298 |

  - Criterios tal como salieron: ✗ 0 CRÍTICOS (5) · ✗ ≥ 95 % sin CRÍTICO ni MAYOR (90.7 %) · ✗ MENOR ≤ 10 % (21.7 %)
    · ✓ seguras ≤ 3 % (0 %) · ✓ p95 chat (2 072 ms) · ✓ p95 análisis (5 726 ms).
  - Los 5 CRÍTICOS (`pago-unico-mensual`, en `faltante-presupuesto` y `foco-ciclo8-costo`) eran falsos positivos:
    comparaban la cuota de Interbank con el pago único en otra cláusula ("…la cuota mensual más baja es S/ 884.86
    (…) y el pago único sería S/ 4,705.86 al inicio"). El chequeo se acotó a la cláusula después de la corrida,
    con esas frases como test. Recalculado sobre la misma corrida (sin volver a llamar a la API): **0 CRÍTICOS**,
    **94.6 %** sin CRÍTICO ni MAYOR (122/129) y MENOR en 21.7 %. Sigue sin cumplir dos criterios.
  - Ya no aparecen: secciones faltantes, `numero-sin-fuente` ("21 h"), electivos contados en cursos, atributos
    de curso incorrectos ni contexto falso.
  - Quedan: `repite-carga` 28 MENOR en 12 casos ([F-030](fallos.md#f-030); 19 citan 25 h o el nivel, 9 solo
    ofrecen "ver tu carga"); `jalado-no-va-primero` 3 y `bika-inteligencia` 3 repeticiones con 4 MAYOR cada una
    ([F-034](fallos.md#f-034)); `incoherente-cachimbo` 1 MAYOR.
  - Costo acumulado del día: US$ 0.1101 (corridas 1 y 2 con el diagnóstico) + US$ 0.0298 = US$ 0.1399 estimado.
- **Propuestas (no aplicadas):**
  1. Carga (MENOR, 21.7 %): la línea de CÓMO HABLAS no alcanza. Proponer: "Fuera de esos casos, no cites las horas
     ni el nivel de carga del próximo periodo ni ofrezcas revisarla; al presentarte, di que ayudas con tu plan y
     sus costos". O decidir que ofrecer "ver tu carga" no cuenta (9 de 28) y dejar el chequeo solo para citar la
     cifra o el nivel: con eso quedaría en 14.7 %, que tampoco cumple.
  2. Jalado primero (MAYOR): agregar a la regla 3 "Cuando hables del próximo periodo, nombra primero el curso jalado
     y su ventana".
  3. Bika con un jalado (MAYOR): agregar a la regla 8 "Si el alumno dice bika o trika, aplica esta regla aunque
     CONTEXTO solo marque el curso como jalado"; y un ejemplo de tono de bika (el ejemplo 1 es de miedo a la bika).
  4. Con 2 y 3, `jalado-proximo-ciclo` y `bika-inteligencia` (6 repeticiones) pasarían de MAYOR a aprobadas si el
     modelo sigue la regla: 128/129 = 99.2 % sin CRÍTICO ni MAYOR (estimación, por verificar con otra corrida).
  5. Dato a revisar: en `incoherente-cachimbo` dijo "te faltan 70 créditos pendientes" (`perfil.creditos.pendientes`,
     que incluye todos los electivos ofrecidos); para egresar faltan 79 (`derivados.creditos.faltanParaEgresar`). No
     lo detecta ningún chequeo; proponer que la regla 1 diga "para egresar, usa derivados.creditos".
- **Verificación:**
  - `pnpm test` (462), `pnpm lint`, `pnpm build` y en `ai-proxy/` `pnpm test` (134) y `pnpm typecheck` en verde
    después de cada commit. `pnpm evaluar --simulado`: 43/43 y todos los criterios.
  - La clave nunca se leyó ni se imprimió; el reporte no la contiene.

## 2026-10-23 · Evaluación real: diagnóstico, razonamiento desactivado, derivados y filtro de salida

- **Qué se hizo:**
  - Diagnóstico por intento en la evaluación: las respuestas vacías o cortadas venían del razonamiento, que
    gastaba todo `max_tokens` ([F-027](fallos.md#f-027)).
  - `thinking` desactivado, `max_tokens` 900/1800 y un reintento si se corta (`RESPUESTA_LARGA`)
    ([D-031](decisiones.md#d-031)).
  - `CONTEXTO.derivados` con las restas y totales ([D-032](decisiones.md#d-032)). "121 de 190" era una
    alucinación: 190 no está en el contexto ([F-029](fallos.md#f-029)).
  - Prompt (autorizado): límites de extensión, la carga solo cuando corresponde, sin sumas ni restas, regla 15
    nueva y un cuarto ejemplo. Huella `5e2a04b6…`.
  - Contexto en un mensaje del sistema entre `<<CONTEXTO_MALLAU>>` y `<<FIN_CONTEXTO_MALLAU>>`
    ([D-033](decisiones.md#d-033), [F-028](fallos.md#f-028)).
  - Filtro de salida en el proxy con una regeneración y respuesta segura `RESPUESTA_NO_VERIFICADA`
    ([D-034](decisiones.md#d-034)).
  - Evaluación: 4 casos nuevos (42), chequeos nuevos y medición de la salida final con criterios de aprobación.
- **Por qué:** la primera corrida real dio 16/38 casos, con 56 CRÍTICOS de JSON inválido.
- **Rama / PR:** `feat/ia-real` (sin PR, sin push).
- **Commits:** `f627423` (1), `755853f` (2), `4bd1de9` (3), `4b7a7a0` (4), `dbcde71` (5), `68e0ab0` (6),
  `16e909e` (7), `288adfd` (8, reporte) y este de docs (9).
- **Resultados:**

  | Corrida | Casos | Repeticiones | CRÍTICO · MAYOR · MENOR | p95 | Salida (tokens) | Costo |
  | --- | --- | --- | --- | --- | --- | --- |
  | Antes (`2026-10-23-1731.md`, 38 × 3) | 16/38 (42 %) | 58/114 (51 %) | 56 · 1 · 1 | 14 096 ms | 97 072 | US$ 0.0723 |
  | Después (`2026-10-23-1841.md`, 42 × 3) | 23/42 (55 %) | 80/126 (63.5 %) | 8 · 17 · 31 | 3 982 ms | 23 292 | US$ 0.0267 |

  - Después, por modo: p95 chat 2 167 ms y análisis 5 296 ms. Filtro de salida: 123 a la primera, 3 regeneradas
    (montos, `montos-800`) y 0 respuestas seguras.
  - Criterios: **no se cumple** 0 CRÍTICOS (8, todos `secciones`, [F-031](fallos.md#f-031)) ni ≥ 95 % (63.5 %;
    87.3 % sin contar los MENOR). Sí se cumplen seguras ≤ 3 % (0 %) y los dos p95.
  - Fallos que quedan: `repite-carga` 30 MENOR ([F-030](fallos.md#f-030)), `falta-mencion` 10, `secciones` 8,
    `numero-sin-fuente` 5 ("21 h", [F-032](fallos.md#f-032)), `sin-apoyo` 2 y `chat-largo` 1.
  - Costo de las corridas de este día: US$ 0.0723 (primera, del autor) + US$ 0.0111 (diagnóstico y verificación)
    + US$ 0.0267 (final) = US$ 0.1101 estimado.
- **Propuestas (no aplicadas: el prompt no se cambia sin el autor):**
  1. Exigir las 5 secciones del análisis: `secciones` con `length(5)` y un tipo por sección en
     `AIAnalisisResponseSchema` (cambia el esquema que recibe el modelo) o un chequeo `secciones` en el filtro de
     salida que regenere con "Faltan las secciones whatIf…". En el prompt: "Modo análisis: siempre las 5
     secciones (financiero, carga, ruta, whatIf, electivos)".
  2. Carga: en la regla 7 cambiar "carga en horas" por "las horas de cada curso"; en la regla 14, "ofrece ayuda
     con su plan, sin cifras"; en el ejemplo 2 quitar "para que… no te pases de carga".
  3. Reescribir el ejemplo 3 sin cuentas (hoy hace "S/ 742.10 − S/ 700" y "24 h → 21 h") y agregar a
     `derivados.cursosProximoPeriodo` las horas del periodo sin cada curso y si deja de pagar recargo.
  4. Electivos: aclarar "créditos electivos" (el modelo dijo "3 electivos") con un campo
     `derivados.creditos.electivosFaltantes` y un chequeo.
  5. Casos: `bika-inteligencia` usa un curso que en el fixture está pendiente (2 de 3 repeticiones lo notaron y
     preguntaron, algo razonable); moverlo a `contexto-plan1-jalado` con HERRAMIENTAS DE DESARROLLO. En
     `cursos-convalide-calculo-ii`, decidir si dar los créditos es obligatorio (MAYOR) o MENOR.
- **Verificación:**
  - `pnpm test`, `pnpm lint` y `pnpm build` en verde después de cada commit; en `ai-proxy/`, `pnpm test` y
    `pnpm typecheck`. `pnpm evaluar --simulado`: 42/42.
  - La clave nunca se leyó ni se imprimió: la lee el script desde `ai-proxy/.env.local` (ignorado por git).

## 2026-10-23 · Asistente IA real: prompt nuevo, control de gasto, evaluación y migración a Vercel

- **Qué se hizo:**
  - Snapshots estables en Windows: `.gitattributes` con LF y renormalización ([F-026](fallos.md#f-026)).
  - Prompt nuevo del asesor: persona, glosario estudiantil, jerga como espejo, bika y trika con la Ley 30220,
    15 reglas y ejemplos de tono ficticios ([D-022](decisiones.md#d-022) a [D-024](decisiones.md#d-024)).
  - Control de gasto en el proxy: origen, `AI_PAUSADO`, límites por IP y por día (memoria o Upstash),
    `max_tokens` por modo y previews siempre en mock ([D-025](decisiones.md#d-025)).
  - Registro de consumo por llamada real (tokens y costo estimado), sin contenido ([D-026](decisiones.md#d-026)).
  - Mocks con el tono nuevo y las mismas reglas.
  - Evaluación `pnpm evaluar` con 38 casos, chequeos por severidad y reporte en `docs/evaluaciones/`
    ([D-027](decisiones.md#d-027)).
  - Migración a Vercel: base `/`, sin GitHub Pages, `vercel.json` con `ignoreCommand` y `VITE_AI_MOCK` para las
    previews ([D-028](decisiones.md#d-028)).
  - Registro de que `main` se forzó a `b/final1` ([D-029](decisiones.md#d-029)).
- **Por qué:** ya hay claves reales de DeepSeek: el asistente pasa de mock a real con el gasto acotado.
- **Rama / PR:** `feat/ia-real`, desde `origin/main` (sin PR, sin push).
- **Commits:** `2c21610` (0), `d8dbf3b` (1), `806d84f` (2), `1dca5b5` (3), `ba827fa` (4), `0601e9a` (5),
  `1a47203` (6) y este de docs (7).
- **Verificación:**
  - `pnpm test`, `pnpm lint` y `pnpm build` en verde después de cada commit; en `ai-proxy/`, `pnpm test` y
    `pnpm typecheck`.
  - `pnpm test` dos veces seguidas deja `git status` limpio.
  - `pnpm verify:base`: base `/` y subruta; el service worker solo tiene la ruta de navegación.
  - `pnpm evaluar --simulado --repeticiones 1`: 38/38 con el fetch simulado.
  - La evaluación contra la API real **no se corrió**: `ai-proxy/.env.local` todavía no existe.
  - `git check-ignore` confirma que `ai-proxy/.env.local` está ignorado (`ai-proxy/.gitignore`, `.env*`).

## 2026-10-23 · Resolución de puntos por verificar

- **Qué se hizo:** se completaron en `docs/` los datos que faltaban:
  - fechas y rama del diagnóstico inicial y de la verificación con el Excel real;
  - condiciones del plan Hobby de Vercel;
  - recarga mínima de DeepSeek;
  - dónde guarda los datos DeepSeek;
  - contenido del Excel de `tests/fixtures`;
  - fecha de F-015;
  - confirmación de la regla de [D-015](decisiones.md#d-015).
- **Por qué:** quitar las marcas "(por verificar)" que ya tienen fuente. Siguen marcados el detalle de la
  historia previa, la relación de `main` con `feature/implementacion-ia` y el PR #6, el despliegue del proxy y
  de la demo, y el origen del `'11'` en `SIN_PRERREQUISITO`.
- **Rama / PR:** `feat/ia-asistente`.
- **Commits:** `docs: resolver puntos por verificar` (ver `git log`).
- **Verificación:** datos aportados por el autor con sus fuentes (citadas en [decisiones.md](decisiones.md)).
  Contenido del Excel revisado en el archivo: una hoja, columnas A–G, sin datos personales. `pnpm test`,
  `pnpm lint` y `pnpm build` en verde.

## 2026-10-23 · Creación de esta documentación

- **Qué se hizo:** carpeta `docs/` (índice con diagrama, bitácora, decisiones, estado, fallos y plantillas),
  plantilla de PR en `.github/pull_request_template.md` y `CLAUDE.md` en la raíz.
- **Por qué:** dejar registro de lo hecho y de las decisiones antes de fusionar el asistente IA, y que quien
  continúe (personas o Claude) lea el estado antes de tocar la lógica.
- **Rama / PR:** `feat/ia-asistente` (sin PR todavía).
- **Commits:** uno por documento, `docs(C1)` a `docs(C8)`. Ver `git log --oneline feat/ia-asistente`
  (un commit no puede citar su propio hash).
- **Verificación:** contenido contrastado con `git log` de todas las ramas locales, `gh pr list`, el código y
  los tests. `pnpm test`, `pnpm lint` y `pnpm build` en verde después de cada commit.

## 2026-10-23 · Pulido del asistente (A1–A2) y preparación de la demo en Vercel (B1–B3)

- **Qué se hizo:**
  - A1: tras el primer envío con un foco (📎), sobre el input queda solo el chip; las 3 sugerencias vuelven si
    cambia el foco. Los chips de la respuesta no repiten las del foco (texto normalizado).
  - A2: cada entrada de `whatIf` trae `ventanaSiJala`, calculada con `ventanaDesdeCiclo`; el mock nombra el
    periodo ("en el Verano 8 o en el Ciclo 9") y la regla 4 del prompt lo pide.
  - B1: `base` de Vite configurable con `VITE_BASE` (por defecto `/utp-malla-optima/`); el manifest y el
    service worker usan la misma base. Script `pnpm verify:base`.
  - B2: `.vercel` ignorado en la raíz (ya lo estaba en `ai-proxy/`).
  - B3: sección "Demo en Vercel" en el README.
- **Por qué:** las sugerencias del foco se repetían y ocupaban la pantalla del celular; el what-if decía
  "en su ventana de recuperación" sin nombrar el periodo; la demo en Vercel se sirve en la raíz del dominio.
- **Rama / PR:** `feat/ia-asistente`.
- **Commits:** `b54b052` (A1), `4201939` (A2), `59fb7a7` (B1), `83c2e8f` (B2), `644559c` (B3).
- **Verificación:** tests `tests/ai/sugerenciasFoco.test.tsx`, `tests/ai/whatIfVentana.test.ts`,
  `tests/ai/deployConfig.test.ts`; huella sha256 del prompt y snapshots actualizados; capturas locales a 360 px
  y 1440 px (no versionadas); `pnpm verify:base` con los dos builds; el build con `VITE_BASE=/` se sirvió en
  la raíz con `vite preview` (service worker con scope `/`).
- **Nota:** con ingreso **marzo**, el verano viene después de los ciclos **pares**, así que I62N en el Ciclo 8
  tiene ventana [Verano 8, Ciclo 9]. El autor confirmó que la regla del dominio es correcta
  ([D-015](decisiones.md#d-015)).

## 2026-10-23 · Asistente IA en modo mock

- **Qué se hizo:** contratos Zod compartidos con el proxy (`src/application/ai/contracts.ts` y copia en
  `ai-proxy/src/`), `buildAIContext` (función pura que calcula todo el contexto), proxy de Vercel en
  `ai-proxy/` con modo mock, prompt del sistema solo en el proxy, cliente HTTP con mock local, paleta con
  contraste AA, UI del asistente (botón flotante, panel, 😊 y 📎, tarjetas por sección) y
  `VITE_AI_ENDPOINT` en el deploy.
- **Por qué:** dar al estudiante explicaciones y consejos sobre su plan sin que la IA calcule nada
  ([D-001](decisiones.md#d-001)), y poder hacer la demo sin clave de DeepSeek ([D-007](decisiones.md#d-007)).
- **Rama / PR:** `feat/ia-asistente`, creada desde `pr/3-jalados` (sin PR todavía).
- **Commits:** `ac2c7cd` (contratos), `0244682` (contexto), `07cd14b` (proxy), `981ff82` (prompt),
  `50d8fc4` (cliente), `e2d79fa` (colores), `ec64e4c` (UI), `66c050f` (deploy), `607f679` (ajustes vistos en
  la verificación).
- **Verificación:** tests en `tests/ai/` y `ai-proxy/tests/`; recorrido completo en una instancia limpia
  con el proxy en mock (subir el Excel, planificar el 8vo, aceptar el aviso, analizar, pregunta rápida y foco
  en un curso) en 390×844, 360×800 y 1440×900, en modo claro y oscuro (78 capturas locales, no versionadas);
  se confirmó en la petición de red que no viaja `nombreArchivoCargado`.

## 2026-10-22 · Ventana de recuperación con verano, gramática y etiquetas

- **Qué se hizo:** la ventana del jalado sigue el calendario UTP: [Verano N, Ciclo N+1] si después del
  Ciclo N hay verano según el mes de ingreso, o [Ciclo N+1] si no; `jaladoPermiteVerano` pasa a `true`. Helper
  `pluralizar` para singular/plural en contadores, avisos, toasts, modal y propuesta. Las etiquetas de estado de
  la tarjeta van en su propia línea.
- **Por qué:** la regla anterior solo admitía el ciclo siguiente ([D-014](decisiones.md#d-014), reemplazada);
  había textos como "1 cursos" y etiquetas encima de los íconos.
- **Rama / PR:** `pr/3-jalados`, PR #5 (fusionado en `dev` el 2026-10-23).
- **Commits:** `dfa139c`, `495f797`, `de7c5ac`, `5de2a02`.
- **Verificación:** `tests/jalados/ventanaRecuperacion.test.ts`, `tests/jalados/pluralJalados.test.tsx`,
  `tests/jalados/etiquetasEstadoTarjeta.test.tsx`; según el mensaje de `de7c5ac`, revisado en 360, 768 y
  1440 px en claro y oscuro.

## 2026-10-22 · Ciclos pasados con horas y créditos llevados, y contadores

- **Qué se hizo:** los ciclos regulares pasados muestran "X h sem · Y cr llevados" (y "Z cr jalados"); los
  contadores del encabezado cuentan al jalado como pendiente y agregan "en curso"; sin aviso de recargo en
  periodos bloqueados.
- **Por qué:** los ciclos pasados no mostraban su carga y los contadores no sumaban el total de la malla.
- **Rama / PR:** `pr/3-jalados`, PR #5.
- **Commits:** `6c364c5`, `fa126e3`, `a661a3b`.
- **Verificación:** `tests/ui/cicloPasado.test.ts`, `tests/ui/contadoresAvance.test.ts` (41 + 7 + 0 + 24 = 72
  y 42 + 7 + 0 + 23 = 72), `tests/ui/avisosCargaFila.test.ts`.

## 2026-10-22 · Cursos jalados y regla UTP

- **Qué se hizo:** modelo `jalado?: boolean` con estado PENDIENTE y `cicloJalado`; el parser reconoce
  `ESTADOS_EXCEL_JALADO`; `marcarComoJalado` / `desmarcarJalado` reemplazan `updateEstadoCurso`;
  `simularJalado` puro; UI para marcar como jalado (luego en el menú del ícono (i)); regla UTP en el movimiento;
  el planificador coloca primero los jalados; "Limpiar plan" los devuelve a su origen y los adelantados van al
  banco; versión del parser y aviso único para datos viejos.
- **Por qué:** el parser importaba "DESAPROBADO" como APROBADO ([F-001](fallos.md#f-001)) y no había forma
  coherente de representar un curso jalado ([F-002](fallos.md#f-002)).
- **Rama / PR:** `pr/3-jalados`, PR #5.
- **Commits:** `73d05c5`, `772ba91`, `2266829`, `32f8b89`, `7942fd2`, `f1b51d5`, `d1cf534`, `4f04aa8`,
  `8174813`, `c6950fc`, `6b3a42b`, `bea8f06`, `027ba6d`, `597d631`.
- **Verificación:** tests en `tests/jalados/` y `tests/application/versionParser.test.ts`; fixture
  `tests/fixtures/Plan_de_Estudio_desaprobado.xlsx` (copia del real con I60N en DESAPROBADO).

## 2026-10-22 · Primera ronda de correcciones (puntos 0 a 10)

- **Qué se hizo:**
  - 0: `ate.test.ts` instancia `FinancialPlanningService`.
  - 1: `.env` ignorado y `.env.example`.
  - 2: aviso de recargo al pasar el último rango de pensión.
  - 3: "Pensión base" separada de "Cuota con descuento".
  - 4: prerrequisitos de nivelación con nombre.
  - 5: regla única `prerrequisitoCumplido`.
  - 6: test del prerrequisito PENDIENTE en ciclo bloqueado.
  - 7: no cotizar periodos bloqueados.
  - 8a–8f: jalados (ver la entrada anterior).
  - 9: método de pago y pago único al store.
  - 10: eliminación de código muerto.
- **Por qué:** fallas vistas en la verificación con el Excel real (avisos, bloqueo visual, costos).
- **Rama / PR:** puntos 0–7 en `pr/2-bugs` (PR #4, fusionado en `dev` el 2026-10-23); 8–10 en `pr/3-jalados`
  (PR #5).
- **Commits:** `f43857d`, `7b39a0b`, `4f973bc`, `8c25215`, `ce65205`, `7250035`, `2c124af`, `acef637`;
  `151ba77`, `dfa46df`.
- **Verificación:** un test por punto (`recargoHoras`, `periodFinancialCard`, `etiquetaPrerrequisito`,
  `prerrequisitoCumplido`, `prerrequisitoBloqueado`, `periodosBloqueados`, `metodoPagoStore`); los totales de
  caracterización no cambiaron (5055.15, 4822.3, 4938.7, 4705.86).

## 2026-10-22 · Tests de caracterización

- **Qué se hizo:** `tests/characterization/planDeEstudio1.test.ts` congela el comportamiento con el Excel
  real `Plan_de_Estudio_1.xlsx`: 72 cursos, 7 EN_CURSO, 4 electivos, decimales de laboratorio, 8vo ciclo de
  25 h con cuota 931.43 y validación de prerrequisitos. Documenta el BUG #5 de `isCursoDesbloqueado`.
- **Por qué:** red de seguridad antes de tocar la lógica ([D-008](decisiones.md#d-008)).
- **Rama / PR:** `pr/1-caracterizacion` (también `test/caracterizacion`), PR #3 (fusionado en `dev` el
  2026-10-23).
- **Commits:** `aebf8de`.
- **Verificación:** el propio test con el fixture real.

## 2026-10-22 · Verificación con el Excel real

- **Qué se hizo:** se cargó el Excel real de un alumno (72 cursos) y se encontraron fallas en los avisos de
  horas, un bloqueo visual falso con prerrequisitos EN_CURSO y el what-if.
- **Por qué:** comprobar el comportamiento real antes de construir el asistente.
- **Rama / PR:** sobre `b/final1`.
- **Commits:** ninguno (fue una revisión). Sus hallazgos se corrigieron en las entradas del 2026-10-22.
- **Verificación:** fecha y rama confirmadas por el autor. Los hallazgos están respaldados por el test de
  caracterización (72 cursos, BUG #5) y por los commits de corrección.

## 2026-10-22 · Diagnóstico inicial del repo

- **Qué se hizo:** revisión del estado del repo. La rama de trabajo era `b/final1` (último commit `f982f4c`,
  2026-10-11, "Feat: Los puntos del doc menos PDF, PNG y todo colores"). `feature/implementacion-ia` tenía un
  asistente solo con mock y otra arquitectura (`src/domain/ai/ai-contracts.ts`, `MockAIProvider`); se tomó
  como referencia para los contratos pero no se fusionó.
- **Por qué:** decidir desde dónde continuar.
- **Rama / PR:** `b/final1`; `feature/implementacion-ia` (PR #2 hacia `feat/react-migration-zully`, fusionado
  el 2026-09-30; PR #1 hacia `main`, que `gh` muestra fusionado el 2026-10-23).
- **Commits:** ninguno.
- **Verificación:** contenido de las ramas confirmado en git; fecha confirmada por el autor. En este
  diagnóstico se detectó también [F-015](fallos.md#f-015) (el tarifario guardado tapa el JSON).

## 2026-09-01 a 2026-10-11 · Historia previa (resumen)

Antes de esta serie de trabajos, el equipo construyó la base en `dev` y ramas derivadas: estructura inicial
(`4631673`, 2026-09-01), UI y reorganización SOLID con algoritmos y exportaciones (`63202ee`, `fed68cf`,
2026-09-13), reglas financieras (`516ea23`, 2026-09-25), integración de la UI de otra rama (`24e09fa`,
2026-09-26; `b7c00dc`, 2026-09-29) y las correcciones de `b/final1` (`8391846`, 2026-10-07; `f982f4c`,
2026-10-11). El detalle de esos cambios está **(por verificar)**: no se revisó commit por commit.
