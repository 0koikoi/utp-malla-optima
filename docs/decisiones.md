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
| [D-003](#d-003) | El frontend sigue en GitHub Pages y se despliega solo desde `dev` | reemplazada |
| [D-004](#d-004) | La demo es un segundo proyecto de Vercel con base configurable | reemplazada |
| [D-005](#d-005) | DeepSeek: `deepseek-flash`, formato OpenAI, JSON validado con Zod, sin herramientas | vigente |
| [D-006](#d-006) | Privacidad: contexto anónimo, consentimiento y logs sin contenido | vigente |
| [D-007](#d-007) | Modo mock hasta que el equipo recargue saldo | reemplazada |
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
| [D-022](#d-022) | Persona del asesor IA y glosario estudiantil en el prompt | vigente |
| [D-023](#d-023) | La jerga es un espejo | vigente |
| [D-024](#d-024) | Bika y trika: regla con la Ley Universitaria 30220, art. 102 | vigente |
| [D-025](#d-025) | Control de gasto en el proxy: origen, interruptor, límites, tokens y previews en mock | vigente |
| [D-026](#d-026) | Registro de consumo por llamada real, sin contenido | vigente |
| [D-027](#d-027) | Evaluación manual contra la API real (`pnpm evaluar`) | vigente |
| [D-028](#d-028) | Despliegue solo en Vercel: dos proyectos, rama de producción `main` | vigente |
| [D-029](#d-029) | `main` forzado a `b/final1`, con respaldo en `respaldo/main-antes-de-force` | vigente |
| [D-030](#d-030) | Finales de línea LF en el repo (`.gitattributes`) | vigente |
| [D-031](#d-031) | Razonamiento desactivado, `max_tokens` 900/1800 y un reintento si se corta | vigente |
| [D-032](#d-032) | `CONTEXTO.derivados`: restas y totales calculados en código | vigente |
| [D-033](#d-033) | El contexto va en un mensaje del sistema entre delimitadores | vigente |
| [D-034](#d-034) | Filtro de salida en el proxy y evaluación de lo que ve el alumno | vigente |
| [D-035](#d-035) | El análisis exige 5 secciones, una de cada tipo, en orden fijo | vigente |
| [D-036](#d-036) | `derivados.horasSinCadaCurso`: las horas sin cada curso, calculadas en código | vigente |
| [D-037](#d-037) | Pago único sin cuota mensual (`derivados.pagoUnico`) | vigente |
| [D-038](#d-038) | Criterios de aprobación de la evaluación (corrida 3) | vigente |
| [D-039](#d-039) | La carga se menciona con excepciones: trabajo, estrés o un jalado, sin cifras | vigente |
| [D-040](#d-040) | El jalado va primero, con el próximo periodo calculado con él (`proximoPeriodoConJalados`) | vigente |
| [D-041](#d-041) | `perfil.creditos.pendientes` pasa a `pendientesEnMalla` | vigente |
| [D-042](#d-042) | Bika y trika con un jalado: regla 8 completa y ejemplo de tono 6 | vigente |

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
- **Estado:** reemplazada por [D-028](#d-028) (el workflow se eliminó en `feat/ia-real`).
- **Contexto:** la web ya se publicaba en GitHub Pages bajo `/utp-malla-optima/`.
- **Decisión:** se mantiene. El build recibe `VITE_AI_ENDPOINT` desde `vars.VITE_AI_ENDPOINT` (variable de
  Actions, no secreto: es una URL pública).
- **Alternativas descartadas:** mover la web a Vercel como único hosting.
- **Consecuencias:** un push a `dev` publica la web; `main` no despliega.

<a id="d-004"></a>
## D-004 · La demo es un segundo proyecto de Vercel con base configurable

- **Fecha:** 2026-10-23 (`59fb7a7`, `644559c`).
- **Estado:** reemplazada por [D-028](#d-028): la web de Vercel ya no es una demo sino el único despliegue, y la
  base por defecto pasó a `/`.
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
- **Actualización:** `max_tokens` pasó a 1200 en análisis y 600 en chat, y se agregó el código `PAUSADO`
  ([D-025](#d-025)). El resto sigue vigente.
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
- **Actualización:** el registro del proxy ahora agrega tokens y costo estimado ([D-026](#d-026)); sigue sin
  contenido.
- **Alternativas descartadas:** enviar el plan completo con el nombre del archivo; guardar conversaciones.
- **Consecuencias:** el asistente no puede usar datos personales; el aviso debe actualizarse si cambia el
  proveedor.

<a id="d-007"></a>
## D-007 · Modo mock hasta que el equipo recargue saldo

- **Fecha:** 2026-10-23 (`07cd14b`).
- **Estado:** reemplazada por [D-025](#d-025): ya hay claves reales; fuera de producción el mock va siempre.
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

<a id="d-022"></a>
## D-022 · Persona del asesor IA y glosario estudiantil en el prompt

- **Fecha:** 2026-10-23 (`d8dbf3b`).
- **Estado:** vigente.
- **Contexto:** el primer prompt sonaba neutro y no entendía cómo escriben los alumnos ("jalé", "bika",
  "tranca", "full chamba").
- **Decisión:**
  - El asistente es "el asesor académico IA de MallaU": un compañero de últimos ciclos, directo, motivador y
    cercano, que tutea. Nunca dice que es una persona, un profesor ni personal de la UTP.
  - El prompt trae un glosario estudiantil (jalar, bika, trika, tranca/yuca, hueco, cachimbo, chamba, matri,
    cruce, profe), 15 reglas y 3 ejemplos de tono con datos ficticios.
  - El texto es **estático**: un prefijo idéntico en cada llamada aprovecha la caché de DeepSeek, que cobra
    mucho menos.
- **Alternativas descartadas:** interpolar datos en el prompt (rompe la caché); ejemplos con cursos reales
  (un test verifica que el prompt no tiene códigos del fixture).
- **Consecuencias:** un test fija la huella sha256 del prompt. Los mocks siguen las mismas reglas
  ([`mockRespuestas.ts`](../src/application/ai/mockRespuestas.ts)).

<a id="d-023"></a>
## D-023 · La jerga es un espejo

- **Fecha:** 2026-10-23 (`d8dbf3b`, `ba827fa`).
- **Estado:** vigente.
- **Contexto:** la jerga acerca, pero con un alumno formal suena fuera de lugar, y junto a un monto o una regla
  le quita seriedad.
- **Decisión:** el asistente usa jerga solo si el alumno la usó primero, con moderación. Si el alumno escribe
  formal, responde sin jerga. Nunca usa jerga al dar montos, reglas o riesgos.
- **Alternativas descartadas:** jerga siempre; nunca jerga.
- **Consecuencias:** la evaluación ([D-027](#d-027)) marca como MAYOR la jerga ante un alumno formal y la jerga
  en la misma frase que un monto. "jalado" cuenta como jerga solo ante un alumno formal, porque también es el
  término de MallaU.

<a id="d-024"></a>
## D-024 · Bika y trika: regla con la Ley Universitaria 30220, art. 102

- **Fecha:** 2026-10-23 (`d8dbf3b`).
- **Estado:** vigente.
- **Contexto:** desaprobar varias veces el mismo curso tiene consecuencias, y MallaU no guarda el número de
  intentos.
- **Decisión:**
  - El número de intentos se toma de lo que dice el alumno; nunca se asume.
  - Bika (2 veces): el próximo intento es clave, porque según la Ley Universitaria 30220 (art. 102) desaprobar
    la misma materia por tercera vez lleva a una separación temporal de un año. Recomendar priorizar el curso
    en su ventana, llevar menos carga y pedir tutoría.
  - Trika (3 veces): con empatía, separación temporal de un año según la ley (una cuarta desaprobación lleva
    al retiro definitivo); la UTP puede tener reglas propias, así que hablar con el tutor o con Servicios
    Académicos. No se inventan detalles del reglamento de la UTP.
- **Alternativas descartadas:** guardar intentos en MallaU; citar un reglamento de la UTP que no está en el
  repo.
- **Consecuencias:** cómo aplica la UTP el art. 102 está **(por verificar)** con la universidad; por eso la
  respuesta deriva al tutor o a Servicios Académicos.

<a id="d-025"></a>
## D-025 · Control de gasto en el proxy: origen, interruptor, límites, tokens y previews en mock

- **Fecha:** 2026-10-23 (`806d84f`). Reemplaza a [D-007](#d-007).
- **Estado:** vigente. El punto de `max_tokens` lo reemplaza [D-031](#d-031) (2026-10-23).
- **Contexto:** ya hay claves reales de DeepSeek y cada llamada cuesta.
- **Decisión:**
  - Origen: sin un `Origin` de `ALLOWED_ORIGINS`, 403 sin leer el cuerpo ni llamar a DeepSeek.
  - Interruptor `AI_PAUSADO=true`: responde `PAUSADO` (503). El frontend muestra "El asistente está en pausa por
    mantenimiento…", también para `SIN_SALDO`: al alumno nunca se le dice que se acabó el saldo.
  - Límites (solo llamadas reales): `AI_LIMITE_IP_HORA` (15) por IP por hora y `AI_LIMITE_DIARIO` (200) por día
    de Lima. IP de `x-forwarded-for` (primer valor) o `x-real-ip`, guardada solo como sha256 con `AI_SALT`.
  - `RateLimiter` en memoria (best effort, por instancia) o Upstash Redis por su API REST (INCR + EXPIRE), si
    hay `UPSTASH_REDIS_REST_*` o `KV_REST_API_*`. Si Upstash falla, sigue en memoria.
  - Al superar un límite: `LIMITE` (429) con mensaje y `reintentarEn`; el frontend muestra la hora aproximada.
  - `max_tokens`: 1200 en análisis y 600 en chat.
  - Previews: si `VERCEL_ENV` no es `production`, el proxy usa siempre el mock, aunque exista la clave. La web
    en preview usa `VITE_AI_MOCK=true` ([D-028](#d-028)).
- **Alternativas descartadas:** dependencias de rate limit (`@upstash/ratelimit`); dejar pasar todo si Upstash
  falla; avisar al alumno que no hay saldo.
- **Consecuencias:** sin Upstash, cada instancia cuenta por su cuenta (el límite real puede ser mayor).
  `AI_SALT` debe definirse en producción.

<a id="d-026"></a>
## D-026 · Registro de consumo por llamada real, sin contenido

- **Fecha:** 2026-10-23 (`1dca5b5`). Actualiza el punto de logs de [D-006](#d-006).
- **Estado:** vigente.
- **Contexto:** hace falta saber cuánto cuesta cada consulta sin guardar lo que escribe el alumno.
- **Decisión:** una línea JSON por petición (`console.log`) con `modo`, `codigo`, `duracion_ms` y `mock`. En las
  llamadas reales agrega `modelo`, `intentos`, `prompt_tokens`, `prompt_cache_hit_tokens`,
  `prompt_cache_miss_tokens`, `completion_tokens`, `tarifa` y `costo_usd`. Precios de deepseek-flash en
  `ai-proxy/src/consumo.ts`, dados por el autor el 2026-10-23: US$ 0.15/M de entrada sin caché, US$ 0.003/M con
  caché y US$ 0.60/M de salida en horario normal; el doble en horario pico.
- **Alternativas descartadas:** registrar el contexto o los mensajes; registrar la IP.
- **Consecuencias:** la franja del horario pico está **(por verificar)**: se configura con `DEEPSEEK_PICO_UTC`;
  sin ella, el costo se estima con la tarifa normal.

<a id="d-027"></a>
## D-027 · Evaluación manual contra la API real (`pnpm evaluar`)

- **Fecha:** 2026-10-23 (`0601e9a`).
- **Estado:** vigente.
- **Contexto:** los tests usan `fetch` simulado; hay que medir cómo responde el modelo real con el prompt nuevo.
- **Decisión:** `ai-proxy/scripts/evaluar.ts` (Node 24, sin dependencias) usa la misma `llamarDeepSeek` que
  producción con 38 casos agrupados por tipo de fallo, 3 repeticiones por defecto y chequeos CRÍTICO / MAYOR /
  MENOR. Un caso pasa solo si pasan todas sus repeticiones. Tope de gasto `EVAL_MAX_USD` (1.00). Reporte en
  `docs/evaluaciones/` y salida 1 si hay algún CRÍTICO. `--simulado` recorre todo sin gastar.
- **Alternativas descartadas:** correrla en CI (gasta saldo en cada push); un framework de evaluación externo.
- **Consecuencias:** si el reporte muestra fallos, el prompt no se cambia sin revisarlo antes con el autor.
  Los fixtures se generan con `buildAIContext` y un test falla si dejan de coincidir.
- **Actualización (2026-10-23, `16e909e`):** usa `llamarConVerificacion` (con el filtro de salida,
  [D-034](#d-034)), 42 casos, guarda cada intento crudo y agrega los criterios de aprobación.

<a id="d-028"></a>
## D-028 · Despliegue solo en Vercel: dos proyectos, rama de producción `main`

- **Fecha:** 2026-10-23 (`1a47203`). Reemplaza a [D-003](#d-003) y [D-004](#d-004).
- **Estado:** vigente.
- **Contexto:** se deja GitHub Pages; la web y el proxy ya iban a vivir en Vercel.
- **Decisión:**
  - Dos proyectos de Vercel conectados al repo, con rama de producción `main`: la web (raíz) y el proxy
    (Root Directory `ai-proxy`).
  - `vite.config.ts` usa la base `/` por defecto; `VITE_BASE` queda opcional.
  - Se eliminan `.github/workflows/deploy.yml` y la dependencia `gh-pages`.
  - `ignoreCommand` en `vercel.json` (ignora `ai-proxy/` y `docs/`) y en `ai-proxy/vercel.json` (solo
    `ai-proxy/`).
  - Las previews de la web usan `VITE_AI_MOCK=true` y nunca llaman al proxy real.
- **Alternativas descartadas:** mantener GitHub Pages en paralelo.
- **Consecuencias:** `pnpm verify:base` comprueba la base `/`, una subruta y que el service worker solo tenga la
  ruta de navegación (no cachea el proxy). La creación de los proyectos en Vercel está **(por verificar)**: no
  consta en el repo.

<a id="d-029"></a>
## D-029 · `main` forzado a `b/final1`, con respaldo en `respaldo/main-antes-de-force`

- **Fecha:** 2026-10-23. Confirmado en git: `origin/main` y `origin/b/final1` apuntan a `9cbfd8e` (merge del
  PR #10); el tag `respaldo/main-antes-de-force` apunta a `90962be` (merge del PR #1 en `main`).
- **Estado:** vigente.
- **Contexto:** `main` tenía la arquitectura mock de `feature/implementacion-ia` (PR #1) y el trabajo nuevo se
  integró en `b/final1` (PRs #7, #9, #10 y #11, fusionados el 2026-10-23).
- **Decisión:** `main` se igualó a `b/final1` con un push forzado. El estado anterior queda en el tag
  `respaldo/main-antes-de-force`. El PR #6 (`dev` → `main`) quedó cerrado sin fusionar.
- **Alternativas descartadas:** **(por verificar)**: no constan en el repo.
- **Consecuencias:** las ramas nuevas salen de `origin/main` (p. ej. `feat/ia-real`). La hora exacta del push
  forzado y quién lo hizo están **(por verificar)**: no constan en el repo.

<a id="d-030"></a>
## D-030 · Finales de línea LF en el repo (`.gitattributes`)

- **Fecha:** 2026-10-23 (`2c21610`).
- **Estado:** vigente.
- **Contexto:** con `core.autocrlf=true`, los snapshots salían con CRLF y Vitest los reescribía con LF
  ([F-026](fallos.md#f-026)).
- **Decisión:** `.gitattributes` con `* text=auto eol=lf` (y binarios explícitos: `xlsx`, `png`, `jpg`, `ico`,
  `woff2`); repo renormalizado.
- **Alternativas descartadas:** pedir a cada uno que cambie `core.autocrlf`.
- **Consecuencias:** correr `pnpm test` dos veces deja `git status` limpio en Windows. Un test verifica el
  `.gitattributes` y que los snapshots no tengan CRLF.

<a id="d-031"></a>
## D-031 · Razonamiento desactivado, `max_tokens` 900/1800 y un reintento si se corta

- **Fecha:** 2026-10-23 (`f627423` diagnóstico, `755853f`). Reemplaza el punto de `max_tokens` de
  [D-025](#d-025).
- **Estado:** vigente.
- **Contexto:** en la primera corrida real, 56 fallos CRÍTICOS de JSON inválido. El diagnóstico por intento mostró
  `finish_reason: "length"` en todos los intentos fallidos y `completion_tokens_details.reasoning_tokens` igual al
  tope (600 o 1200) en los vacíos: `deepseek-flash` razona por defecto y `max_tokens` incluye el razonamiento
  ([F-027](fallos.md#f-027)). Según la documentación, `thinking` viene en `enabled` (esfuerzo `high`) y se
  desactiva con `thinking: {type: "disabled"}` o `reasoning_effort: "none"`
  (https://api-docs.deepseek.com/api/create-chat-completion, https://api-docs.deepseek.com/guides/thinking_mode).
- **Decisión:**
  - `thinking: {type: "disabled"}` en cada llamada: la tarea es redactar datos ya calculados.
  - `max_tokens`: 900 en chat y 1800 en análisis.
  - Si `finish_reason` es `"length"`: UN reintento con un mensaje del sistema al final que pide máximo 60 palabras
    en chat o 2 frases por sección. Si vuelve a cortarse: `RESPUESTA_LARGA`; el frontend muestra "No pude terminar
    la respuesta, intenta preguntarlo más corto" con Reintentar.
  - El log de consumo agrega `finish_reasons` (uno por intento) y `reasoning_tokens`.
- **Alternativas descartadas:** subir `max_tokens` sin desactivar el razonamiento (más gasto y latencia);
  `reasoning_effort: "low"` (sigue gastando tokens en razonar).
- **Consecuencias:** en la corrida final, 0 respuestas cortadas, salida de 23 292 tokens contra 97 072 y p95 de
  3 982 ms contra 14 096 ms.

<a id="d-032"></a>
## D-032 · `CONTEXTO.derivados`: restas y totales calculados en código

- **Fecha:** 2026-10-23 (`4bd1de9`). Aplica [D-001](#d-001).
- **Estado:** vigente.
- **Contexto:** el modelo restaba por su cuenta ("te faltarían S/ 61.57") e inventaba totales ("121 créditos
  aprobados de 190": 190 no está en ningún campo del contexto; aprobados 121 + en curso 19 + pendientes 70 = 210)
  ([F-029](fallos.md#f-029)).
- **Decisión:** `buildAIContext` agrega `derivados`:
  - `horas`: del próximo periodo, sobre el tope de la escala y sobre las 24 h recomendadas (y los márgenes);
  - `presupuesto`: por escenario de pago, la diferencia contra el presupuesto por mes y por ciclo (diferencia
    mensual × número de cuotas; la matrícula va aparte), con signo y como "falta" o "sobra";
  - `creditos`: total de la malla, obligatorios, electivos mínimos (`creditosMinimosElectivos` de
    `academic.json`), para egresar (obligatorios + electivos mínimos), aprobados que cuentan (los electivos solo
    hasta el mínimo), faltantes, faltantes si aprueba lo que lleva y ciclos restantes;
  - `cursosProximoPeriodo`: créditos, horas, estado, jalado y si se puede mover sin dejar sin prerrequisito a
    otro curso planificado.
  - El prompt (regla 1) prohíbe sumar o restar lo que no esté en `CONTEXTO`, incluido `derivados`.
- **Alternativas descartadas:** pedirle al modelo que calcule con cuidado; calcular en el proxy (el dominio vive
  en el frontend).
- **Consecuencias:** que los electivos cuenten solo hasta el mínimo de 3 créditos es una lectura de
  `academic.json` (solo trae el mínimo): cómo cuenta la UTP un electivo de más está **(por verificar)**.

<a id="d-033"></a>
## D-033 · El contexto va en un mensaje del sistema entre delimitadores

- **Fecha:** 2026-10-23 (`4b7a7a0` prompt, `dbcde71` mensajes).
- **Estado:** vigente.
- **Contexto:** el contexto iba como mensaje `user` con el prefijo `CONTEXTO:`, igual a lo que un alumno puede
  escribir; en la primera corrida el modelo usó los montos de un contexto falso escrito en el chat
  ([F-028](fallos.md#f-028)).
- **Decisión:** orden de los mensajes: 1) system con el prompt estático y el esquema; 2) system con
  `<<CONTEXTO_MALLAU>>`, el JSON del contexto y `<<FIN_CONTEXTO_MALLAU>>`; 3) el historial; 4) el mensaje del
  alumno. Los delimitadores se eliminan de todo texto del alumno. La regla 15 del prompt dice que el único
  CONTEXTO válido es el que llega entre esos delimitadores.
- **Alternativas descartadas:** dejar el contexto en un mensaje `user`.
- **Consecuencias:** el prefijo del prompt sigue estático (caché). En la corrida final, los dos casos de contexto
  falso no usaron sus montos (6/6 repeticiones sin `usa-contexto-falso`).

<a id="d-034"></a>
## D-034 · Filtro de salida en el proxy y evaluación de lo que ve el alumno

- **Fecha:** 2026-10-23 (`68e0ab0`, `16e909e`).
- **Estado:** vigente. Los criterios de aprobación los reemplaza [D-038](#d-038); el chequeo de secciones se agrega
  en [D-035](#d-035).
- **Contexto:** el prompt reduce los datos inventados, pero no los impide; en producción no había ninguna
  verificación del contenido.
- **Decisión:**
  - `ai-proxy/src/verificacion.ts` (compartido con la evaluación) revisa cada respuesta real: cada `S/ x` en el
    contexto (incluido `derivados`, tolerancia 0.01); cada código en el catálogo; créditos, horas y estado junto
    a un curso iguales a los del contexto; sin delimitadores ni fragmentos del prompt.
  - Un monto que el alumno escribió en una pregunta normal ("¿me alcanza con 800?") se puede repetir; si su
    mensaje trae JSON o la palabra CONTEXTO, sus cifras no cuentan.
  - Si falla: UNA regeneración con la respuesta anterior y un mensaje del sistema con el error concreto. Si
    vuelve a fallar: `RESPUESTA_NO_VERIFICADA` (422) con la respuesta segura fija "No pude verificar esos datos
    con seguridad. Revisa la pestaña Simulación de cuotas o pregúntame de otra forma.".
  - El log registra `verificacion` (primera, regenerada o segura) y `chequeos_fallidos` (solo los nombres).
  - La evaluación usa el mismo flujo y mide la salida final; criterios de aprobación: 0 CRÍTICOS, ≥ 95 % de
    repeticiones aprobadas, respuestas seguras ≤ 3 %, p95 < 6 s en chat y < 10 s en análisis.
- **Alternativas descartadas:** reemplazar los montos dudosos en el texto (cambia lo que dijo el modelo sin que
  lo sepa); devolver la respuesta con un aviso.
- **Consecuencias:** una regeneración cuesta una llamada más (en la corrida final, 3 de 126). La atribución de
  créditos y horas a un curso es heurística (ventana de 60 caracteres después del curso); un falso positivo
  termina en una regeneración o en la respuesta segura.

<a id="d-035"></a>
## D-035 · El análisis exige 5 secciones, una de cada tipo, en orden fijo

- **Fecha:** 2026-10-23 (`3cf0d8a`).
- **Estado:** vigente.
- **Contexto:** en la corrida 1841, 8 de 9 análisis omitieron `whatIf` o `electivos`: el contrato aceptaba
  cualquier arreglo de secciones ([F-031](fallos.md#f-031)).
- **Decisión:**
  - `AIAnalisisResponseSchema.secciones` es una tupla de 5 en el orden carga, financiero, ruta, whatIf, electivos
    (`TIPOS_SECCION`); el esquema JSON que recibe el modelo lo dice con `prefixItems`. El prompt (modo análisis)
    pide las 5 en ese orden.
  - El proxy lee la respuesta con secciones libres y el filtro de salida, si falta, sobra o cambia el orden de
    alguna, hace UNA regeneración con el error concreto ("Faltan las secciones whatIf. Incluye exactamente 5
    secciones, en este orden: …"). El frontend valida con el contrato estricto.
- **Alternativas descartadas:** rechazar el análisis sin regenerar (más respuestas seguras); completar en el
  proxy las secciones que falten (texto que no escribió el modelo).
- **Consecuencias:** el mock siempre arma las 5 secciones (con texto de reemplazo si no hay costos o what-if).
  Corrida 3: 0 fallos de secciones.

<a id="d-036"></a>
## D-036 · `derivados.horasSinCadaCurso`: las horas sin cada curso, calculadas en código

- **Fecha:** 2026-10-23 (`2c23a8d`). Aplica [D-001](#d-001) y amplía [D-032](#d-032).
- **Estado:** vigente.
- **Contexto:** el modelo restaba horas ("si sacas un curso de 4 h bajas a 21 h"), copiando el ejemplo 3 viejo
  del prompt ([F-032](fallos.md#f-032)).
- **Decisión:** por cada curso del próximo periodo, las horas efectivas del periodo sin él
  (`calcularHorasEfectivas`) y si así quedaría dentro del tope de la escala (`null` sin tope). El filtro de
  salida no le atribuye al curso las horas del periodo dichas después de "bajarías a", "quedas en", etc.
- **Alternativas descartadas:** prohibir solo en el prompt que el modelo hable de quitar cursos.
- **Consecuencias:** corrida 3: 0 `numero-sin-fuente`.

<a id="d-037"></a>
## D-037 · Pago único sin cuota mensual (`derivados.pagoUnico`)

- **Fecha:** 2026-10-23 (`a425a31`, prompt en `c5aab81` y `94c3334`).
- **Estado:** vigente. Reemplaza el "equivalente mensual" del pago único de [D-032](#d-032).
- **Contexto:** en la UTP el pago único es pagar todas las pensiones del ciclo juntas al inicio, con 7.5 % de
  descuento: no tiene cuota mensual. El contexto lo traía como cuota (pensión / 5) con diferencia mensual contra el
  presupuesto, y la Simulación de cuotas decía "Cuotas: 5" ([F-033](fallos.md#f-033)).
- **Decisión:**
  - En `buildAIContext`, el escenario `pago_unico` lleva `cuotaMensual` y `diferenciaPresupuesto` en `null`, y
    `derivados.presupuesto` no lo incluye.
  - `derivados.pagoUnico`: `pensionAlInicio`, `matricula`, `totalCiclo`, `ahorroVsSinDescuento` y, si hay
    presupuesto, `diferenciaVsPresupuestoDelCiclo` (presupuesto × cuotas − pensión) con
    `comparacion: "comparación referencial"`. Montos de `FinancialPlanningService`; solo restas en código.
  - `PeriodFinancialCard`: con pago único, "Forma de pago: una sola vez, al inicio del ciclo" y "Pensión del ciclo
    (pago único)"; los montos no cambian.
  - Prompt: regla 1 y ejemplo de tono 5.
- **Alternativas descartadas:** seguir dando un equivalente mensual "de referencia".
- **Consecuencias:** corrida 3: el modelo explica el pago único al inicio; los 5 fallos marcados eran falsos
  positivos del chequeo ([D-038](#d-038)).

<a id="d-038"></a>
## D-038 · Criterios de aprobación de la evaluación (corrida 3)

- **Fecha:** 2026-10-23 (`2d1191b`). Reemplaza los criterios de [D-034](#d-034).
- **Estado:** vigente.
- **Contexto:** con "≥ 95 % de repeticiones aprobadas", un MENOR pesaba igual que un CRÍTICO.
- **Decisión:** sobre lo que ve el alumno: 0 CRÍTICOS; ≥ 95 % de repeticiones sin CRÍTICO ni MAYOR; MENOR en
  ≤ 10 % de las repeticiones; respuestas seguras ≤ 3 %; p95 < 6 s en chat y < 10 s en análisis. Chequeos CRÍTICOS
  nuevos: `pago-unico-mensual` (en la misma cláusula que "pago único") y `electivos-como-cursos`.
- **Alternativas descartadas:** —.
- **Consecuencias:** `pago-unico-mensual` se acotó a la cláusula después de la corrida 1922, que marcó 5 falsos
  positivos (comparaciones con la cuota de otro método); el recálculo sobre esa corrida está en la bitácora.

<a id="d-039"></a>
## D-039 · La carga se menciona con excepciones: trabajo, estrés o un jalado, sin cifras

- **Fecha:** 2026-10-23 (`f444d6b` prompt, `61dfdc7` evaluación).
- **Estado:** vigente. Reemplaza la línea de la carga de CÓMO HABLAS de 2026-10-23 (`4b7a7a0`).
- **Contexto:** con la regla anterior, el modelo seguía citando o "ofreciendo revisar" la carga fuera de tema
  (28 MENOR en la corrida 1922), y la regla chocaba con aconsejar menos carga a quien trabaja o jaló.
- **Decisión:** la carga (horas, nivel o número de cursos) se menciona si la pregunta trata de carga, horas,
  costos o del plan, en el análisis, o si el alumno cuenta que trabaja, que está estresado o que jaló; en esos
  últimos casos se recomienda menos carga sin repetir cifras. Fuera de eso, ni cifras ni ofrecer revisarla; al
  presentarse, "su plan y sus costos". El chequeo `repite-carga` sigue la misma regla.
- **Alternativas descartadas:** prohibir la palabra "carga" (impide el consejo de la regla 8).
- **Consecuencias:** corrida 4: 11 `repite-carga` (de 28). Los que quedan citan cifras (25 h, 22 h, 29 h).

<a id="d-040"></a>
## D-040 · El jalado va primero, con el próximo periodo calculado con él (`proximoPeriodoConJalados`)

- **Fecha:** 2026-10-23 (`b4a6a0f` datos, `f444d6b` prompt). Aplica [D-001](#d-001).
- **Estado:** vigente.
- **Contexto:** con un jalado fuera de su ventana, el contexto describía el próximo periodo sin él (25 h), aunque
  tiene que ir ahí ([F-035](fallos.md#f-035)); el modelo lo nombraba al final ([F-034](fallos.md#f-034)).
- **Decisión:**
  - `derivados.proximoPeriodoConJalados`: los jalados fuera de su ventana cuya ventana incluye el próximo periodo,
    puestos en él; horas, créditos, si supera el tope y las 24 h, la cuota de cada escenario y el bloque de pago
    único, con `calcularHorasEfectivas` y `FinancialPlanningService`.
  - `derivados.planificadosBloqueadosPorJalado`: `planificadosSinJalado` del dominio (la misma regla que la app),
    filtrado al próximo periodo.
  - Regla 3: nombrar primero el jalado y su ventana, decir que los demás quedan bloqueados hasta agregarlo y usar
    esos derivados para horas y costos.
- **Alternativas descartadas:** dejar que el modelo sume las horas del jalado.
- **Consecuencias:** corrida 4 (recalculada): `jalado-proximo-ciclo` 3/3, con 29 h en lugar de 25 h.

<a id="d-041"></a>
## D-041 · `perfil.creditos.pendientes` pasa a `pendientesEnMalla`

- **Fecha:** 2026-10-23 (`019b1ce`).
- **Estado:** vigente.
- **Contexto:** "te faltan 70 créditos pendientes" en la corrida 1922: el modelo usó `pendientes` (todos los cursos
  pendientes, incluidos todos los electivos ofrecidos) como lo que falta para egresar (79).
- **Decisión:** el campo se llama `pendientesEnMalla` (mismo significado); la regla 1 dice que para egresar se usa
  `derivados.creditos.faltanParaEgresar`. Chequeo `creditos-faltantes` en `incoherente-cachimbo`.
- **Alternativas descartadas:** quitar el campo (lo usa el mock y sirve como dato del avance).
- **Consecuencias:** corrida 4: 0 `creditos-faltantes`.

<a id="d-042"></a>
## D-042 · Bika y trika con un jalado: regla 8 completa y ejemplo de tono 6

- **Fecha:** 2026-10-23 (`f444d6b`).
- **Estado:** vigente. Amplía [D-024](#d-024).
- **Contexto:** con el curso marcado como jalado, el modelo aplicaba la regla 3 (ventana) y omitía la 8 (ley,
  tutoría, priorizar, menos carga): `bika-inteligencia` 0/3 en la corrida 1922.
- **Decisión:** al inicio de la regla 8, aplicarla aunque CONTEXTO solo diga jalado, con ventana, riesgo según la
  ley, priorizar, menos carga y tutoría en la misma respuesta. Ejemplo de tono 6 ("hice bika en estadística"),
  ficticio, con `CODIGO-EJEMPLO-2`.
- **Alternativas descartadas:** que el alumno marque las veces que jaló (MallaU no guarda intentos).
- **Consecuencias:** corrida 4 (recalculada): `bika-inteligencia` 3/3 y `trika-herramientas` con todo lo pedido,
  pero en 83 a 88 palabras (MENOR `chat-largo` 3/3).
