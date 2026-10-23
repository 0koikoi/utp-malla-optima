Última actualización: 2026-10-23

# Plantillas

Copia el bloque que necesites. Reemplaza lo que está entre `<…>`. Si un dato no se puede confirmar en el
código o en git, escribe **(por verificar)**. No incluyas claves, tokens, URLs privadas ni datos personales.

<a id="entrada-de-bitácora"></a>
## Entrada de bitácora

Va al **inicio** de [bitacora.md](bitacora.md) (la más reciente arriba).

```markdown
## AAAA-MM-DD · <Título corto>

- **Qué se hizo:** <cambios concretos, en frases cortas>.
- **Por qué:** <problema o necesidad; enlaza decisiones o fallos: [D-0XX](decisiones.md#d-0xx), [F-0XX](fallos.md#f-0xx)>.
- **Rama / PR:** `<rama>`, PR #<n> (<estado>).
- **Commits:** `<hash corto>`, `<hash corto>`.
- **Verificación:** <tests nuevos o actualizados, capturas, comandos (pnpm test, lint, build)>.
```

<a id="decisión"></a>
## Decisión

Va al final de [decisiones.md](decisiones.md), con el siguiente ID libre, y se agrega una fila al índice.
Si reemplaza a otra, cambia la anterior a `reemplazada por [D-0XX](#d-0xx)`; no la borres.

```markdown
<a id="d-0XX"></a>
## D-0XX · <Decisión en una línea>

- **Fecha:** AAAA-MM-DD (`<hash corto>`).
- **Estado:** vigente | reemplazada por [D-0YY](#d-0yy) | por confirmar.
- **Contexto:** <qué problema o restricción había>.
- **Decisión:** <qué se decidió, con archivos y nombres de funciones>.
- **Alternativas descartadas:** <opciones evaluadas y por qué no>.
- **Consecuencias:** <qué cambia, qué queda pendiente, riesgos>.
```

<a id="fallo"></a>
## Fallo

Va en la sección que corresponda de [fallos.md](fallos.md) (corregidos, pendientes o no priorizados), con el
siguiente ID libre, y se agrega una fila al índice.

```markdown
<a id="f-0XX"></a>
### F-0XX · <Fallo en una línea>

- **Fecha:** AAAA-MM-DD
- **Síntoma:** <qué ve el estudiante o qué falla>.
- **Causa raíz:** <por qué pasa>.
- **Archivo:** `<ruta>`.
- **Estado:** corregido | pendiente | no priorizado.
- **Commit:** `<hash corto>` | —
- **Test:** `<ruta del test>` | —
```
