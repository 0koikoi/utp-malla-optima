Última actualización: 2026-10-23

# Decisiones

Cada decisión tiene un ID estable (D-001…). Una decisión no se borra: si cambia, se registra una nueva y la
anterior pasa a **reemplazada**. Estados: **vigente**, **reemplazada**, **por confirmar**.
Lo que no se pudo confirmar en el código o en git está marcado **(por verificar)**.
Plantilla: [plantillas.md](plantillas.md#decisión).

## Índice

| ID | Decisión | Estado |
| --- | --- | --- |
| [D-001](#d-001) | Cálculos deterministas en código; la IA solo explica y aconseja | vigente |
| [D-002](#d-002) | Sin backend propio: proxy serverless en Vercel, proyecto aparte | vigente |
| [D-003](#d-003) | El frontend sigue en GitHub Pages y se despliega solo desde `dev` | vigente |
| [D-004](#d-004) | La demo es un segundo proyecto de Vercel con base configurable | vigente |
| [D-005](#d-005) | DeepSeek: `deepseek-flash`, formato OpenAI, JSON validado con Zod, sin herramientas | vigente |
| [D-006](#d-006) | Privacidad: contexto anónimo, consentimiento y logs sin contenido | vigente |
| [D-007](#d-007) | Modo mock hasta que el equipo recargue saldo | vigente |
| [D-008](#d-008) | Tests de caracterización antes de tocar lógica; Excel real en `tests/fixtures` | vigente |
| [D-009](#d-009) | Regla única `prerrequisitoCumplido` (casos a–d) | vigente |
| [D-010](#d-010) | No se cotizan periodos bloqueados | vigente |
| [D-011](#d-011) | Aviso de 24 h independiente del aviso de recargo | vigente |
| [D-012](#d-012) | Modelo de jalado: `jalado?: boolean` + `cicloJalado`, estado PENDIENTE | vigente |
| [D-013](#d-013) | `ESTADOS_EXCEL_JALADO = ['DESAPROBADO']` | por confirmar |
| [D-014](#d-014) | Jalado obligatorio solo en el ciclo siguiente (primera versión) | reemplazada |
| [D-015](#d-015) | Regla UTP del jalado: ventana según el calendario | vigente |
| [D-016](#d-016) | `marcarComoJalado` / `desmarcarJalado` y `simularJalado` reemplazan `updateEstadoCurso` | vigente |
| [D-017](#d-017) | Método de pago y pago único en el store | vigente |
| [D-018](#d-018) | UI del asistente: 📎 y 😊 abren sugerencias | vigente |
| [D-019](#d-019) | Paleta del asistente para modo claro y oscuro | vigente |
| [D-020](#d-020) | PWA responsive con safe areas y botón atrás de Android | vigente |
| [D-021](#d-021) | Flujo de Git: PRs apilados, merge commit y sin coautoría de Claude | vigente |

---

<a id="d-001"></a>
## D-001 · Cálculos deterministas en código; la IA solo explica y aconseja

- **Fecha:** 2026-10-23 (`0244682`). El criterio ya regía los cálculos previos.
- **Estado:** vigente.
- **Contexto:** prerrequisitos, costos, carga, what-if y ruta tienen reglas exactas de la UTP. Un modelo de
  lenguaje puede equivocarse con números o inventar cursos.
- **Decisión:** todo lo numérico y lógico lo calcula el código: `prerrequisitoCumplido`, `FinancialEngine`,
  `calcularCarga`, `simularJalado`, `ventanaDesdeCiclo` y `generateOptimalPlanUseCase`. `buildAIContext` lo
  entrega ya calculado. El prompt (`ai-proxy/src/systemPrompt.ts`) prohíbe recalcular o inventar, y la
  respuesta se valida con Zod y se descartan los códigos de curso que no existan en el contexto.
- **Alternativas descartadas:** pedirle a la IA que calcule costos o cadenas de prerrequisitos; usar
  herramientas (function calling) para que consulte datos.
- **Consecuencias:** las respuestas citan cifras verificables por tests; si cambia una regla, se cambia en el
  dominio y el asistente la hereda. La IA no puede proponer cambios que el código no calcule.

<a id="d-002"></a>
## D-002 · Sin backend propio: proxy serverless en Vercel, proyecto aparte

- **Fecha:** 2026-10-23 (`07cd14b`).
- **Estado:** vigente.
- **Contexto:** la API key de DeepSeek no puede ir en el navegador, y el equipo no mantiene un servidor.
- **Decisión:** una función serverless en `ai-proxy/api/asistente.ts` (handlers web `POST` y `OPTIONS`),
  desplegada como **proyecto de Vercel aparte** con Root Directory `ai-proxy`. Guarda la API key y el prompt;
  aplica CORS por `ALLOWED_ORIGINS`, límite de 64 KB, Zod y timeout de 30 s. Usa el plan Hobby de Vercel:
  gratis, solo para uso personal no comercial y con funciones de hasta 300 s, así que el timeout de 30 s
  cabe de sobra (fuente: <https://vercel.com/docs/plans/hobby>, actualizada el 2026-09-14).
- **Alternativas descartadas:** backend propio; llamar a DeepSeek desde el navegador; usar el SDK de OpenAI
  (se usa `fetch` directo).
- **Consecuencias:** `ai-proxy/` tiene su propio `package.json` y tests; `contracts.ts` y `mockRespuestas.ts`
  se copian del frontend y un test falla si difieren.

<a id="d-003"></a>
## D-003 · El frontend sigue en GitHub Pages y se despliega solo desde `dev`

- **Fecha:** confirmado en `.github/workflows/deploy.yml` (`on: push: branches: [dev]`); `VITE_AI_ENDPOINT`
  se agregó el 2026-10-23 (`66c050f`).
- **Estado:** vigente.
- **Contexto:** la web ya se publicaba en GitHub Pages bajo `/utp-malla-optima/`.
- **Decisión:** se mantiene. El build recibe `VITE_AI_ENDPOINT` desde `vars.VITE_AI_ENDPOINT` (variable de
  Actions, no secreto: es una URL pública).
- **Alternativas descartadas:** mover la web a Vercel como único hosting.
- **Consecuencias:** un push a `dev` publica la web; `main` no despliega.

<a id="d-004"></a>
## D-004 · La demo es un segundo proyecto de Vercel con base configurable

- **Fecha:** 2026-10-23 (`59fb7a7`, `644559c`).
- **Estado:** vigente.
- **Contexto:** la demo se sirve en la raíz de un dominio de Vercel, y GitHub Pages en `/utp-malla-optima/`.
- **Decisión:** `vite.config.ts` usa `process.env.VITE_BASE ?? '/utp-malla-optima/'`; el manifest de la PWA
  fija `start_url` y `scope` en esa base. La demo usa `VITE_BASE=/` (Root Directory: raíz, Vite,
  `pnpm build`, `dist`).
- **Alternativas descartadas:** rewrites en Vercel para simular `/utp-malla-optima/`.
- **Consecuencias:** `pnpm verify:base` comprueba los dos builds. El dominio de la demo debe estar en
  `ALLOWED_ORIGINS`. En Git Bash de Windows, `VITE_BASE=/` se convierte en una ruta (MSYS): probar con
  PowerShell o con el script.

<a id="d-005"></a>
## D-005 · DeepSeek: `deepseek-flash`, formato OpenAI, JSON validado con Zod, sin herramientas

- **Fecha:** 2026-10-23 (`07cd14b`).
- **Estado:** vigente.
- **Contexto:** se necesita un modelo barato que devuelva JSON.
- **Decisión:**
  - Modelo por `DEEPSEEK_MODEL`, por defecto `deepseek-flash` (vigente en api-docs.deepseek.com al
    2026-10-23).
  - Endpoint `https://api.deepseek.com/chat/completions` con `response_format: json_object`,
    `temperature: 0.3` y `max_tokens: 1200`.
  - La respuesta se valida con Zod; si no es válida, se reintenta una vez y luego se devuelve
    `RESPUESTA_INVALIDA`.
  - **No** se activan herramientas, búsqueda web ni fetch (tienen cobro aparte).
  - Recarga mínima: US$ 2.00 + 6 % de impuesto (US$ 0.12) = US$ 2.12. El saldo puede tardar de 24 a 72 h en
    acreditarse (fuente: platform.deepseek.com/top_up, revisado el 2026-10-22).
- **Alternativas descartadas:** activar herramientas o búsqueda web; respuestas en texto libre.
- **Consecuencias:** códigos de error propios: `SIN_SALDO` (402), `LIMITE` (429), `PROVEEDOR_CAIDO` (5xx o
  timeout), `ENTRADA_INVALIDA` (400) y `RESPUESTA_INVALIDA`.

<a id="d-006"></a>
## D-006 · Privacidad: contexto anónimo, consentimiento y logs sin contenido

- **Fecha:** 2026-10-23 (`0244682`, `07cd14b`, `ec64e4c`).
- **Estado:** vigente.
- **Contexto:** el plan del estudiante sale del dispositivo hacia un servicio externo.
- **Decisión:**
  - `buildAIContext` copia campos explícitos y excluye `nombreArchivoCargado` (hay test).
  - Antes del primer envío se muestra un aviso de una sola vez: "Enviaremos tu plan de forma anónima a un
    servicio de IA externo (DeepSeek)…". Sin aceptar, no se envía nada.
  - El proxy solo registra `resultado`, `modo`, `ms` y `mock` (hay test).
  - El historial vive en memoria.
  - Según la política de privacidad de DeepSeek, los datos se guardan en servidores de la R. P. China; también
    lo han reportado medios como VentureBeat y TechTarget. Por eso se mantiene el aviso de consentimiento.
- **Alternativas descartadas:** enviar el plan completo con el nombre del archivo; guardar conversaciones.
- **Consecuencias:** el asistente no puede usar datos personales; el aviso debe actualizarse si cambia el
  proveedor.

<a id="d-007"></a>
## D-007 · Modo mock hasta que el equipo recargue saldo

- **Fecha:** 2026-10-23 (`07cd14b`).
- **Estado:** vigente.
- **Contexto:** el equipo no tiene clave de DeepSeek por ahora.
- **Decisión:** sin `DEEPSEEK_API_KEY` el proxy responde con mocks armados con los datos reales del contexto
  y espera unos 800 ms. En producción, sin clave, el mock solo se activa con `AI_MOCK=true`.
  `AI_MOCK=true` fuerza el mock aunque haya clave. En `pnpm dev` sin `VITE_AI_ENDPOINT`, el cliente usa
  `MockAIClient` con la misma lógica.
- **Alternativas descartadas:** ocultar el asistente hasta tener clave.
- **Consecuencias:** la demo es creíble pero simulada. No hay una etiqueta visible de "respuestas simuladas"
  cuando el mock lo hace el proxy ([F-024](fallos.md#f-024)).

<a id="d-008"></a>
## D-008 · Tests de caracterización antes de tocar lógica; Excel real en `tests/fixtures`

- **Fecha:** 2026-10-22 (`aebf8de`).
- **Estado:** vigente.
- **Contexto:** se iban a corregir reglas sin tests previos.
- **Decisión:** congelar el comportamiento actual con `Plan_de_Estudio_1.xlsx` en
  `tests/characterization/planDeEstudio1.test.ts`. Cada cambio intencional de comportamiento se documenta en
  su commit (p. ej. BUG #5 en `7250035`). El Excel real queda versionado en `tests/fixtures/` por decisión
  del autor.
- **Alternativas descartadas:** escribir solo tests unitarios nuevos; usar un Excel inventado.
- **Consecuencias:** el fixture queda en el repo. Tiene una sola hoja ("Plan de Estudio") con 7 columnas
  (código, nombre, horas, créditos, tipo, prerrequisito y estado) y no contiene nombre, código de alumno ni
  DNI; se revisó en el archivo el 2026-10-23.

<a id="d-009"></a>
## D-009 · Regla única `prerrequisitoCumplido` (casos a–d)

- **Fecha:** 2026-10-22 (`7250035`; jalado en `73d05c5`).
- **Estado:** vigente.
- **Contexto:** había varias implementaciones de "prerrequisito cumplido" que daban resultados distintos
  (bloqueo visual falso, [F-006](fallos.md#f-006)).
- **Decisión:** `prerrequisitoCumplido(codigo, cursos, periodoDestino, contexto)` en `prerequisiteService`.
  Un prerrequisito se cumple si:
  - a) está APROBADO o CONVALIDADO;
  - b) está EN_CURSO y el destino es posterior al ciclo actual;
  - c) está PENDIENTE en un periodo anterior al destino que no está bloqueado;
  - d) no existe en la malla (nivelación).

  Un jalado en su ciclo original **nunca** cumple.
- **Alternativas descartadas:** mantener reglas separadas por pantalla.
- **Consecuencias:** `isCursoDesbloqueado` y `validarPrerequisitosParaPeriodo` usan la misma regla.

<a id="d-010"></a>
## D-010 · No se cotizan periodos bloqueados

- **Fecha:** 2026-10-22 (`acef637`).
- **Estado:** vigente.
- **Contexto:** se sumaban al costo ciclos ya cursados ([F-003](fallos.md#f-003)).
- **Decisión:** `FinancialEngine` recibe `cicloActual` y excluye los ciclos regulares con
  `ciclo <= cicloActual`. El verano del ciclo actual sí se cotiza. Un jalado sin replanificar no se cotiza.
- **Alternativas descartadas:** dejar que el estudiante desmarque ciclos a mano.
- **Consecuencias:** los totales de caracterización no cambiaron (5055.15 con ciclo actual 7).

<a id="d-011"></a>
## D-011 · Aviso de 24 h independiente del aviso de recargo

- **Fecha:** 2026-10-22 (`4f973bc`, `a661a3b`).
- **Estado:** vigente.
- **Contexto:** el aviso de horas no coincidía con el tarifario ([F-005](fallos.md#f-005)).
- **Decisión:** "Más de 24 h" es la recomendación académica (`horasRecomendadasPeriodo`). El aviso de recargo
  sale al pasar el `maxHoras` del último rango de pensión, leído del tarifario con `obtenerHorasSinRecargo`
  (hoy 22 h, no escrito fijo). Los periodos bloqueados no muestran recargo.
- **Alternativas descartadas:** un único aviso.
- **Consecuencias:** un ciclo de 23 h muestra solo el recargo; uno de 25 h, ambos.

<a id="d-012"></a>
## D-012 · Modelo de jalado: `jalado?: boolean` + `cicloJalado`, estado PENDIENTE

- **Fecha:** 2026-10-22 (`73d05c5`; `cicloJalado` en `4f04aa8`).
- **Estado:** vigente.
- **Contexto:** hacía falta representar un curso desaprobado.
- **Decisión:** el jalado es un PENDIENTE con `jalado: true` y `cicloJalado`. La excepción es
  `esJaladoSinReplanificar`: mientras siga en su lugar original no cumple prerrequisitos ni se cotiza. Como
  el campo no está indexado, **no hay migración de Dexie**.
- **Alternativas descartadas:** un nuevo estado `JALADO` en `EstadoCurso` (obligaba a ampliar enums de Zod
  y Dexie, y switches).
- **Consecuencias:** los registros existentes quedan con `jalado` indefinido (no jalado); el respaldo JSON
  conserva el campo.

<a id="d-013"></a>
## D-013 · `ESTADOS_EXCEL_JALADO = ['DESAPROBADO']`

- **Fecha:** 2026-10-22 (`772ba91`).
- **Estado:** por confirmar.
- **Contexto:** no se tiene un Excel real de un alumno con jalados.
- **Decisión:** una sola constante en `src/adapters/utpExcelAdapter.ts`, comparada sin mayúsculas ni tildes.
  Se comprueba antes que "APROB", que antes convertía DESAPROBADO en APROBADO ([F-001](fallos.md#f-001)).
- **Alternativas descartadas:** inferir el jalado por la nota.
- **Consecuencias:** si el texto real es otro, basta con agregarlo a la constante. Pendiente de confirmar
  con un Excel real ([estado.md](estado.md#preguntas-abiertas-para-confirmar-con-la-utp)).

<a id="d-014"></a>
## D-014 · Jalado obligatorio solo en el ciclo siguiente (primera versión)

- **Fecha:** 2026-10-22 (`4f04aa8`).
- **Estado:** reemplazada por [D-015](#d-015) (`dfa139c`).
- **Contexto:** primera versión de la regla UTP.
- **Decisión:** el periodo de recuperación era el ciclo regular siguiente al actual; el verano solo si
  `jaladoPermiteVerano` (entonces `false`).
- **Alternativas descartadas:** —
- **Consecuencias:** no reflejaba el calendario de veranos según el mes de ingreso.

<a id="d-015"></a>
## D-015 · Regla UTP del jalado: ventana según el calendario

- **Fecha:** 2026-10-22 (`dfa139c`; planificador en `8174813`). Regla confirmada por el autor el 2026-10-23.
- **Estado:** vigente.
- **Contexto:** la UTP permite recuperar en el verano inmediato, si existe.
- **Decisión:**
  - Obligatorio en su ventana: [Verano N si existe, Ciclo N+1] (`ventanaDesdeCiclo` en `jaladoRules`).
  - El mes de ingreso decide si hay verano (`permiteVeranoDespuesDe`): marzo, después de los ciclos pares;
    agosto, después de los impares.
  - `jaladoPermiteVerano: true` en `academic.json`; sin mes de ingreso no se asume verano.
  - Mientras no esté en su ventana, bloquea los demás cursos de ese periodo y de los posteriores.
  - El planificador lo coloca en el primer periodo de la ventana (el verano, si existe y admite los
    créditos).
  - El what-if del asistente usa la misma función (`ventanaSiJala`, `4201939`).
- **Alternativas descartadas:** [D-014](#d-014).
- **Consecuencias:** con ingreso marzo, el verano viene después de los ciclos pares, así que I62N en el
  Ciclo 8 tiene ventana [Verano 8, Ciclo 9]. Si el
  verano de recuperación es opcional u obligatorio está por confirmar (hoy se asume opcional).

<a id="d-016"></a>
## D-016 · `marcarComoJalado` / `desmarcarJalado` y `simularJalado` reemplazan `updateEstadoCurso`

- **Fecha:** 2026-10-22 (`2266829`, `32f8b89`).
- **Estado:** vigente.
- **Contexto:** `updateEstadoCurso` permitía cualquier estado y dejaba datos incoherentes
  ([F-002](fallos.md#f-002)).
- **Decisión:** `marcarComoJalado` (solo EN_CURSO), `desmarcarJalado` (deshace) y `simularJalado`, una
  función pura sin efectos en el store que usan el modal, el toast (`bea8f06`) y el asistente.
- **Alternativas descartadas:** validar `updateEstadoCurso`.
- **Consecuencias:** un único camino para marcar jalados, con Deshacer.

<a id="d-017"></a>
## D-017 · Método de pago y pago único en el store

- **Fecha:** 2026-10-22 (`151ba77`).
- **Estado:** vigente.
- **Contexto:** vivían en el `useState` de `PlanificadorPanel` y se perdían al cerrarlo; la IA los necesitaba.
- **Decisión:** `metodoPago` y `pagoUnicoPorPeriodo` en `financialSlice`, con `setMetodoPago` y
  `setPagoUnico`. No se persisten en IndexedDB.
- **Alternativas descartadas:** persistirlos.
- **Consecuencias:** `buildAIContext` lee el método elegido del store.

<a id="d-018"></a>
## D-018 · UI del asistente: 📎 y 😊 abren sugerencias

- **Fecha:** 2026-10-23 (`ec64e4c`; pulido en `b54b052`).
- **Estado:** vigente (decisión de producto).
- **Contexto:** el estudiante no sabe qué preguntar.
- **Decisión:** 😊 abre "Preguntas rápidas" (5 chips); 📎 abre "Preguntar sobre…" (plan completo, un ciclo
  o un curso con buscador) y deja un chip de foco con 3 sugerencias hasta el primer envío. El foco viaja en
  `AIRequest.foco`.
- **Alternativas descartadas:** un menú de comandos con texto.
- **Consecuencias:** las sugerencias se deduplican por texto normalizado.

<a id="d-019"></a>
## D-019 · Paleta del asistente para modo claro y oscuro

- **Fecha:** 2026-10-23 (`e2d79fa`).
- **Estado:** vigente.
- **Contexto:** contraste AA y coherencia con la app.
- **Decisión:** tokens `--ia-*` en `src/components/ai/asistente.css`. En modo claro reutilizan las variables
  de `tokens.css` cuando coinciden; en oscuro, la paleta propia. El modo oscuro sigue a `data-theme="dark"`.
  Un test exige 4.5:1 para texto y 3:1 para iconos.
- **Alternativas descartadas:** reutilizar sin cambios las variables oscuras de la app (no coincidían).
- **Consecuencias:** el hover oscuro `#F43F5E` con blanco da 3.6:1, válido para iconos pero no para texto
  ([F-023](fallos.md#f-023)).

<a id="d-020"></a>
## D-020 · PWA responsive con safe areas y botón atrás de Android

- **Fecha:** 2026-10-23 (`ec64e4c`).
- **Estado:** vigente.
- **Contexto:** la app se usa como PWA en celulares.
- **Decisión:** el panel ocupa la pantalla completa en celular (100dvh, `env(safe-area-inset-*)`,
  `visualViewport` para el teclado) y es de 400×600 en escritorio. Esc y el botón atrás de Android
  (`history.pushState` / `popstate`) lo cierran; el foco queda atrapado en el diálogo; el input usa 16 px
  (sin zoom en iOS).
- **Alternativas descartadas:** un panel fijo también en el celular.
- **Consecuencias:** en celular, un toast puede tapar el botón flotante ([F-022](fallos.md#f-022)).

<a id="d-021"></a>
## D-021 · Flujo de Git: PRs apilados, merge commit y sin coautoría de Claude

- **Fecha:** PRs #3, #4 y #5 fusionados en `dev` el 2026-10-23.
- **Estado:** vigente.
- **Contexto:** cambios grandes y dependientes entre sí.
- **Decisión:**
  - PRs apilados: caracterización (`pr/1-caracterizacion`) → bugs (`pr/2-bugs`) → jalados (`pr/3-jalados`) →
    asistente IA con demo y docs (`feat/ia-asistente`).
  - Se fusionan con **merge commit**, nunca squash: `adf5c42`, `372078c` y `893cdda` tienen dos padres.
  - Los commits no llevan coautoría de Claude (0 en las ramas locales al 2026-10-23).
  - No se hace push sin pedirlo.
- **Alternativas descartadas:** un único PR grande; squash.
- **Consecuencias:** cada PR se revisa por separado y conserva su historia.
