Última actualización: 2026-10-23

# Fallos

Cada fallo tiene un ID estable (F-001…). Estados: **corregido**, **pendiente**, **no priorizado**.
Hashes confirmados con `git log`; lo que no se pudo confirmar está marcado **(por verificar)**.
Plantilla: [plantillas.md](plantillas.md#fallo).

## Índice

| ID | Fallo | Estado |
| --- | --- | --- |
| [F-001](#f-001) | El parser importaba "DESAPROBADO" como APROBADO | corregido |
| [F-002](#f-002) | `updateEstadoCurso` dejaba datos incoherentes | corregido |
| [F-003](#f-003) | Se cotizaban ciclos bloqueados | corregido |
| [F-004](#f-004) | Un pendiente en un ciclo pasado contaba como prerrequisito cumplido | corregido |
| [F-005](#f-005) | El aviso de horas no coincidía con el tarifario | corregido |
| [F-006](#f-006) | Bloqueo visual falso con prerrequisitos EN_CURSO | corregido |
| [F-007](#f-007) | La etiqueta "Pensión base" era engañosa | corregido |
| [F-008](#f-008) | Prerrequisitos de nivelación sin nombre | corregido |
| [F-009](#f-009) | 2 tests de `ate.test.ts` llamaban a un método estático inexistente | corregido |
| [F-010](#f-010) | El contador del encabezado no incluía jalados | corregido |
| [F-011](#f-011) | Etiquetas superpuestas a los íconos de la tarjeta | corregido |
| [F-012](#f-012) | Gramática singular/plural | corregido |
| [F-013](#f-013) | Sugerencias duplicadas del foco | corregido |
| [F-014](#f-014) | What-if sin ventana concreta | corregido |
| [F-015](#f-015) | El tarifario guardado en IndexedDB tapa los cambios del JSON | pendiente |
| [F-016](#f-016) | `creditosMaximos` / `creditosMinimos` no se aplican | pendiente |
| [F-017](#f-017) | Valor mágico `'11'` en `SIN_PRERREQUISITO` | pendiente |
| [F-018](#f-018) | Lógica duplicada de sumas de créditos y horas | pendiente |
| [F-019](#f-019) | Faltan los íconos de la PWA declarados en el manifest | pendiente |
| [F-020](#f-020) | README con texto de plantilla y `TESTING_PHASE_7_10.md` desactualizado | pendiente |
| [F-021](#f-021) | Descuento bancario sobre el recargo por horas, por confirmar | pendiente |
| [F-022](#f-022) | En el celular, un toast tapa el botón del asistente | no priorizado |
| [F-023](#f-023) | Hover oscuro `#F43F5E` con blanco: 3.6:1 | no priorizado |
| [F-024](#f-024) | No hay etiqueta visible de respuestas simuladas | no priorizado |
| [F-025](#f-025) | El tooltip "Preguntas rápidas" queda fijo sobre los mensajes | no priorizado |

---

## Corregidos

<a id="f-001"></a>
### F-001 · El parser importaba "DESAPROBADO" como APROBADO

- **Fecha:** 2026-10-22
- **Síntoma:** un curso desaprobado aparecía como aprobado y contaba como prerrequisito cumplido.
- **Causa raíz:** `normalizarEstado` buscaba `'APROB'` por inclusión, y "DESAPROBADO" la contiene.
- **Archivo:** `src/adapters/utpExcelAdapter.ts`.
- **Estado:** corregido.
- **Commits:**
  - `772ba91`: la comprobación de `ESTADOS_EXCEL_JALADO` va antes.
  - `027ba6d`: `VERSION_PARSER = 2` y aviso único para volver a subir el Excel si la malla guardada se
    importó con la versión 1.
- **Tests:** `tests/jalados/parserJalado.test.ts`, `tests/application/versionParser.test.ts`.

<a id="f-002"></a>
### F-002 · `updateEstadoCurso` dejaba datos incoherentes

- **Fecha:** 2026-10-22
- **Síntoma:** permitía pasar un curso a cualquier estado sin reubicarlo ni revisar sus dependientes.
- **Causa raíz:** setter genérico sin reglas; además no tenía consumidores en la UI.
- **Archivo:** `src/store/courseActionsSlice.ts` (y su firma en `src/store/types.ts`).
- **Estado:** corregido.
- **Commit:** `2266829` (reemplazado por `marcarComoJalado` / `desmarcarJalado`; [D-016](decisiones.md#d-016)).
- **Test:** `tests/jalados/marcarComoJalado.test.ts`.

<a id="f-003"></a>
### F-003 · Se cotizaban ciclos bloqueados

- **Fecha:** 2026-10-22 (bug #2)
- **Síntoma:** el total incluía ciclos ya cursados.
- **Causa raíz:** `FinancialEngine` cotizaba todo curso PENDIENTE ubicado en un periodo, sin mirar el ciclo
  actual.
- **Archivo:** `src/financial/engine/FinancialEngine.ts`.
- **Estado:** corregido.
- **Commit:** `acef637` ([D-010](decisiones.md#d-010)).
- **Test:** `tests/financial/periodosBloqueados.test.ts`.

<a id="f-004"></a>
### F-004 · Un pendiente en un ciclo pasado contaba como prerrequisito cumplido

- **Fecha:** 2026-10-22 (bug #3)
- **Síntoma:** un prerrequisito PENDIENTE que quedó en un ciclo bloqueado habilitaba cursos posteriores.
- **Causa raíz:** la regla aceptaba cualquier PENDIENTE ubicado antes del destino.
- **Archivo:** `src/domain/services/prerequisiteService.ts`.
- **Estado:** corregido.
- **Commits:** `7250035` (regla c de `prerrequisitoCumplido`) y `2c124af` (test).
- **Test:** `tests/domain/prerrequisitoBloqueado.test.ts`.

<a id="f-005"></a>
### F-005 · El aviso de horas no coincidía con el tarifario

- **Fecha:** 2026-10-22
- **Síntoma:** solo existía el aviso de 24 h, pero el recargo empieza al pasar las 22 h del último rango de
  pensión.
- **Causa raíz:** no había un aviso ligado al tarifario.
- **Archivo:** `src/domain/rules/planningRules.ts`, `src/components/CicloRow.tsx`.
- **Estado:** corregido.
- **Commits:** `4f973bc`; `a661a3b` (sin recargo en periodos bloqueados). Ver [D-011](decisiones.md#d-011).
- **Tests:** `tests/domain/recargoHoras.test.ts`, `tests/ui/avisosCargaFila.test.ts`.

<a id="f-006"></a>
### F-006 · Bloqueo visual falso con prerrequisitos EN_CURSO

- **Fecha:** 2026-10-22 (BUG #5 de la caracterización)
- **Síntoma:** S73T e I62N se veían bloqueados aunque sus prerrequisitos (SI67 y S61T) estaban EN_CURSO.
- **Causa raíz:** `isCursoDesbloqueado` no consideraba EN_CURSO para periodos futuros; había reglas
  duplicadas.
- **Archivo:** `src/domain/services/prerequisiteService.ts`.
- **Estado:** corregido.
- **Commit:** `7250035` ([D-009](decisiones.md#d-009)).
- **Tests:** `tests/domain/prerrequisitoCumplido.test.ts`; `tests/characterization/planDeEstudio1.test.ts`
  (valor cambiado a propósito).

<a id="f-007"></a>
### F-007 · La etiqueta "Pensión base" era engañosa

- **Fecha:** 2026-10-22
- **Síntoma:** con pronto pago, "Pensión base" mostraba la cuota ya con descuento.
- **Causa raíz:** la tarjeta usaba `montoPorCuota` en lugar de `cuotaBase`.
- **Archivo:** `src/financial/components/PeriodFinancialCard.tsx`.
- **Estado:** corregido.
- **Commit:** `8c25215`.
- **Test:** `tests/financial/periodFinancialCard.test.tsx`.

<a id="f-008"></a>
### F-008 · Prerrequisitos de nivelación sin nombre

- **Fecha:** 2026-10-22
- **Síntoma:** el tooltip mostraba códigos sueltos como `100000X104`.
- **Causa raíz:** los cursos de nivelación no están en la malla importada.
- **Archivo:** `src/presentation/selectors/plannerCardRules.ts` (`etiquetaPrerrequisito`).
- **Estado:** corregido.
- **Commit:** `ce65205`.
- **Test:** `tests/presentation/etiquetaPrerrequisito.test.ts`.

<a id="f-009"></a>
### F-009 · 2 tests de `ate.test.ts` llamaban a un método estático inexistente

- **Fecha:** 2026-10-22
- **Síntoma:** los tests fallaban.
- **Causa raíz:** `calcular()` es un método de instancia de `FinancialPlanningService` y se invocaba como
  estático.
- **Archivo:** `tests/financial/utp/2026/ate.test.ts`.
- **Estado:** corregido.
- **Commit:** `f43857d`.
- **Test:** el mismo archivo (el diff de `f43857d` cambia las 2 llamadas `FinancialPlanningService.calcular(`).

<a id="f-010"></a>
### F-010 · El contador del encabezado no incluía jalados

- **Fecha:** 2026-10-22
- **Síntoma:** los contadores no sumaban el total de la malla; un jalado en su ciclo contaba como planificado.
- **Causa raíz:** el conteo no distinguía al jalado sin replanificar y faltaba "en curso".
- **Archivo:** `src/presentation/selectors/plannerCardRules.ts` (`contarAvance`), `src/hooks/useAppController.ts`.
- **Estado:** corregido.
- **Commits:** `d1cf534`, `fa126e3`.
- **Test:** `tests/ui/contadoresAvance.test.ts`.

<a id="f-011"></a>
### F-011 · Etiquetas superpuestas a los íconos de la tarjeta

- **Fecha:** 2026-10-22
- **Síntoma:** "Marcar como jalado", "Prerrequisito sin cumplir" y "Jalado · llevar en…" quedaban debajo de
  los íconos absolutos de la tarjeta.
- **Causa raíz:** la última línea de la tarjeta la ocupan los íconos con posición absoluta.
- **Archivo:** `src/components/CourseCard.tsx`, `src/styles/cards.css`.
- **Estado:** corregido.
- **Commits:** `d1cf534`, `597d631`, `de7c5ac` (etiquetas en su propia línea).
- **Test:** `tests/jalados/etiquetasEstadoTarjeta.test.tsx`; revisado en 360, 768 y 1440 px.

<a id="f-012"></a>
### F-012 · Gramática singular/plural

- **Fecha:** 2026-10-22
- **Síntoma:** textos como "1 cursos permanecen en el banco" o "Agregar jalados" con un solo curso.
- **Causa raíz:** textos con plural fijo.
- **Archivo:** `src/utils/pluralizar.ts` y los textos que lo usan.
- **Estado:** corregido.
- **Commits:** `495f797`, `5de2a02`.
- **Test:** `tests/jalados/pluralJalados.test.tsx`.

<a id="f-013"></a>
### F-013 · Sugerencias duplicadas del foco

- **Fecha:** 2026-10-23
- **Síntoma:** tras preguntar con un foco (📎) seguían sus 3 sugerencias sobre el input y la respuesta podía
  repetirlas como chips.
- **Causa raíz:** las sugerencias del foco se mostraban siempre y no se comparaban con las de la respuesta.
- **Archivo:** `src/components/ai/controladorAsistente.ts`, `AsistentePanel.tsx`, `AsistenteEntrada.tsx`,
  `AsistenteMensajes.tsx`, `asistenteLogica.ts`.
- **Estado:** corregido.
- **Commit:** `b54b052`.
- **Test:** `tests/ai/sugerenciasFoco.test.tsx`.

<a id="f-014"></a>
### F-014 · What-if sin ventana concreta

- **Fecha:** 2026-10-23
- **Síntoma:** "¿Qué pasa si lo jalo?" respondía "en su ventana de recuperación" sin nombrar el periodo.
- **Causa raíz:** el contexto del what-if no traía la ventana hipotética.
- **Archivo:** `src/application/ai/buildAIContext.ts` (`ventanaSiJala`), `mockRespuestas.ts` (2 copias),
  `ai-proxy/src/systemPrompt.ts`.
- **Estado:** corregido.
- **Commit:** `4201939`.
- **Tests:** `tests/ai/whatIfVentana.test.ts`, `ai-proxy/tests/handler.test.ts`, huella del prompt en
  `ai-proxy/tests/systemPrompt.test.ts`.

## Pendientes

<a id="f-015"></a>
### F-015 · El tarifario guardado en IndexedDB tapa los cambios del JSON

- **Fecha:** 2026-10-22, en el primer diagnóstico; confirmado de nuevo en el código el 2026-10-23.
- **Síntoma:** si se actualiza `src/data/.../ate.json`, quien ya usó la app sigue viendo el tarifario viejo.
- **Causa raíz:** `useAppController` solo carga `FinancialConfigurationProvider.load()` si no hay un
  tarifario guardado; `cargarDesdeDB` usa el persistido.
- **Archivo:** `src/hooks/useAppController.ts`, `src/store/courseImportSlice.ts`.
- **Estado:** pendiente. **Commit:** —. **Test:** —.

<a id="f-016"></a>
### F-016 · `creditosMaximos` / `creditosMinimos` no se aplican

- **Fecha:** confirmado en el código el 2026-10-23.
- **Síntoma:** se puede planificar un ciclo con menos de 12 o más de 40 créditos sin aviso.
- **Causa raíz:** los límites de `academic.json` solo se validan en el esquema (`academicConfigValidator.ts`)
  y se envían al asistente; ninguna regla los usa.
- **Archivo:** `src/domain/rules/planningRules.ts` (donde debería aplicarse).
- **Estado:** pendiente. **Commit:** —. **Test:** —.

<a id="f-017"></a>
### F-017 · Valor mágico `'11'` en `SIN_PRERREQUISITO`

- **Fecha:** confirmado en el código el 2026-10-23.
- **Síntoma:** un prerrequisito con el texto "11" se trata como "sin prerrequisito", sin explicación.
- **Causa raíz:** constante sin documentar; su origen en el Excel UTP está **(por verificar)**.
- **Archivo:** `src/adapters/utpExcelAdapter.ts`.
- **Estado:** pendiente. **Commit:** —. **Test:** —.

<a id="f-018"></a>
### F-018 · Lógica duplicada de sumas de créditos y horas

- **Fecha:** confirmado en el código el 2026-10-23.
- **Síntoma:** riesgo de que dos pantallas muestren totales distintos.
- **Causa raíz:** sumas `reduce` de `creditos` / `horasSemanales` repetidas en `CicloRow`, `PDFReport`,
  `PlanificadorPanel`, `planningRules`, `planBuilder`, `budgetCalculator`, `useAppController`,
  `plannerCardRules` y `buildAIContext`.
- **Archivo:** los mencionados.
- **Estado:** pendiente. **Commit:** —. **Test:** —.

<a id="f-019"></a>
### F-019 · Faltan los íconos de la PWA declarados en el manifest

- **Fecha:** confirmado en el código el 2026-10-23.
- **Síntoma:** el manifest declara `pwa-192x192.png` y `pwa-512x512.png` (e `includeAssets` declara
  `favicon.ico` y `apple-touch-icon.png`), pero `public/` solo tiene `favicon.svg` e `icons.svg`; la
  instalación como PWA queda sin ícono.
- **Causa raíz:** los archivos nunca se agregaron.
- **Archivo:** `vite.config.ts`, `public/`.
- **Estado:** pendiente. **Commit:** —. **Test:** —.

<a id="f-020"></a>
### F-020 · README con texto de plantilla y `TESTING_PHASE_7_10.md` desactualizado

- **Fecha:** confirmado el 2026-10-23.
- **Síntoma:** `README.md` conserva el texto de la plantilla de Vite (desde "React Compiler"), y
  `TESTING_PHASE_7_10.md` (último cambio `516ea23`, 2026-09-25) indica instalar Vitest a mano, aunque ya está
  en `package.json`.
- **Causa raíz:** documentos sin mantenimiento.
- **Archivo:** `README.md`, `TESTING_PHASE_7_10.md`.
- **Estado:** pendiente (las secciones del asistente y de la demo ya están al inicio del README).
  **Commit:** —. **Test:** —.

<a id="f-021"></a>
### F-021 · Descuento bancario sobre el recargo por horas, por confirmar

- **Fecha:** confirmado en el código el 2026-10-23.
- **Síntoma:** con pronto pago, el descuento también reduce el recargo por horas adicionales. No se sabe si
  la UTP lo hace así.
- **Causa raíz:** `calcularCuotaEscalaFija` devuelve la cuota con el recargo incluido, y el descuento se
  calcula sobre esa `cuotaBase`.
- **Archivo:** `src/financial/engine/budgetCalculator.ts`.
- **Estado:** pendiente de confirmar con la UTP ([estado.md](estado.md#preguntas-abiertas-para-confirmar-con-la-utp)).
  **Commit:** —. **Test:** —.

## No priorizados (detectados en la revisión del asistente)

<a id="f-022"></a>
### F-022 · En el celular, un toast tapa el botón del asistente

- **Fecha:** 2026-10-23
- **Síntoma:** el toast "Carga horaria recomendada superada" queda encima del botón flotante hasta que se
  cierra.
- **Causa raíz:** el toast y el botón comparten la esquina inferior; `debeOcultarFab` no considera
  `notificacionMovimiento`.
- **Archivo:** `src/components/ai/asistenteLogica.ts`, `src/components/PrerequisitoToast.tsx`.
- **Estado:** no priorizado. **Commit:** —. **Test:** —.

<a id="f-023"></a>
### F-023 · Hover oscuro `#F43F5E` con blanco: 3.6:1

- **Fecha:** 2026-10-23
- **Síntoma:** el hover del acento en modo oscuro no cumple AA para texto (4.5:1); sí cumple 3:1 para iconos.
- **Causa raíz:** el valor viene de la paleta pedida ([D-019](decisiones.md#d-019)).
- **Archivo:** `src/components/ai/asistente.css`.
- **Estado:** no priorizado (hoy solo se usa en botones de ícono y en "Aceptar"/"Analizar mi plan" en hover).
  **Commit:** —. **Test:** `tests/ai/asistenteColores.test.ts` lo exige solo a 3:1.

<a id="f-024"></a>
### F-024 · No hay etiqueta visible de respuestas simuladas

- **Fecha:** 2026-10-23
- **Síntoma:** cuando el mock lo hace el proxy, nada indica que las respuestas son simuladas. Con
  `MockAIClient` local, la cabecera dice "En línea · demo".
- **Causa raíz:** el cliente HTTP no sabe si el proxy respondió en mock.
- **Archivo:** `src/infrastructure/ai/HttpAIClient.ts`, `ai-proxy/src/handler.ts`.
- **Estado:** no priorizado. **Commit:** —. **Test:** —.

<a id="f-025"></a>
### F-025 · El tooltip "Preguntas rápidas" queda fijo sobre los mensajes

- **Fecha:** 2026-10-23
- **Síntoma:** la primera vez, el tooltip tapa parte del último mensaje o del chip de foco durante unos 6 s.
- **Causa raíz:** posición absoluta sobre el botón 😊, sin reubicarse.
- **Archivo:** `src/components/ai/AsistenteEntrada.tsx`, `asistente.css`.
- **Estado:** no priorizado. **Commit:** —. **Test:** —.
