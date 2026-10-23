Última actualización: 2026-10-23

# Bitácora

Registro cronológico, del más reciente al más antiguo. Fechas y hashes tomados de `git log` de las ramas
locales. Lo que no se pudo confirmar en git o en el código está marcado **(por verificar)**.
Plantilla: [plantillas.md](plantillas.md#entrada-de-bitácora).

---

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
- **Nota:** con la regla del dominio, ingreso **marzo** tiene verano después de los ciclos **pares**, así que
  un curso en el Ciclo 8 tiene ventana [Verano 8, Ciclo 9], no [Ciclo 9]. Ver
  [D-015](decisiones.md#d-015).

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

## Fecha por verificar (antes del 2026-10-22) · Verificación con el Excel real

- **Qué se hizo:** se cargó el Excel real de un alumno (72 cursos) y se encontraron fallas en los avisos de
  horas, un bloqueo visual falso con prerrequisitos EN_CURSO y el what-if.
- **Por qué:** comprobar el comportamiento real antes de construir el asistente.
- **Rama / PR:** sobre `b/final1` **(por verificar)**.
- **Commits:** ninguno (fue una revisión). Sus hallazgos se corrigieron en las entradas del 2026-10-22.
- **Verificación:** confirmado indirectamente por el test de caracterización (72 cursos, BUG #5) y por los
  commits de corrección. La fecha exacta y la lista completa de hallazgos están **(por verificar)**.

## Fecha por verificar (antes del 2026-10-22) · Diagnóstico inicial del repo

- **Qué se hizo:** revisión del estado del repo. La rama de trabajo era `b/final1` (último commit `f982f4c`,
  2026-10-11, "Feat: Los puntos del doc menos PDF, PNG y todo colores"). `feature/implementacion-ia` tenía un
  asistente solo con mock y otra arquitectura (`src/domain/ai/ai-contracts.ts`, `MockAIProvider`); se tomó
  como referencia para los contratos pero no se fusionó.
- **Por qué:** decidir desde dónde continuar.
- **Rama / PR:** `b/final1`; `feature/implementacion-ia` (PR #2 hacia `feat/react-migration-zully`, fusionado
  el 2026-09-30; PR #1 hacia `main`, que `gh` muestra fusionado el 2026-10-23).
- **Commits:** ninguno.
- **Verificación:** contenido de las ramas confirmado en git. La fecha del diagnóstico está **(por verificar)**.

## 2026-09-01 a 2026-10-11 · Historia previa (resumen)

Antes de esta serie de trabajos, el equipo construyó la base en `dev` y ramas derivadas: estructura inicial
(`4631673`, 2026-09-01), UI y reorganización SOLID con algoritmos y exportaciones (`63202ee`, `fed68cf`,
2026-09-13), reglas financieras (`516ea23`, 2026-09-25), integración de la UI de otra rama (`24e09fa`,
2026-09-26; `b7c00dc`, 2026-09-29) y las correcciones de `b/final1` (`8391846`, 2026-10-07; `f982f4c`,
2026-10-11). El detalle de esos cambios está **(por verificar)**: no se revisó commit por commit.
