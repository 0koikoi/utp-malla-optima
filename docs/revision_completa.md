# 🔍 Revisión Completa del Proyecto — UTP Malla Óptima

> Revisión de código, arquitectura, duplicados, inconsistencias y deudas técnicas.

---

## 1. DUPLICACIÓN DE LÓGICA — Dos motores de planificación automática paralelos

> [!CAUTION]
> Este es el problema más grave del proyecto. Hay **dos implementaciones completamente independientes** del mismo algoritmo de planificación óptima.

### Motor 1: `services/autoPlannerService.ts`
- Función: `generarPlanificacionOptima(cursos: Record<string, Curso>, ...)`
- Trabaja con `Record<string, Curso>` (formato del `plannerStore`)
- Retorna `{ nuevasAsignaciones, resumen: PlanificacionResumen }`
- Usa **DP (mochila 0/1)** con `Map<string, number>` para asignaciones
- Lee `curso.prerequisitos` (campo canónico)

### Motor 2: `domain/services/automaticPlanningService.ts`
- Función: `generarPlanificacionAutomatica(cursosEntrada: Curso[], ...)`
- Trabaja con `CursoEnPlanificador[]` (formato del `useAcademicStore`)
- Retorna `ResultadoPlanificacionAutomatica` (más rico)
- Delega a `semesterOptimizationService.ts` y `recommendationService.ts`
- Lee `curso.prerrequisitos` (campo del mundo academic — alias con typo)

**Problema concreto:** `plannerStore.autoPlanificar()` usa el Motor 1, pero `FinancialDrawer` → `useAcademicStore.generarPlanificacionOptima()` → `generateOptimalPlanUseCase` que llama al Motor 2. Se ejecutan **rutas diferentes** para la misma operación visible en UI.

**Además:** `recommendationService.ts` y `autoPlannerService.ts` tienen ambos una función llamada `calcularImpactoFuturo` con firmas incompatibles (`Curso[]` vs `Record<string, Curso>`).

---

## 2. DUPLICACIÓN: Dos implementaciones de `calcularImpactoFuturo`

| Archivo | Firma | Tipo de grafo |
|---|---|---|
| `services/autoPlannerService.ts:28` | `(codigo, cursos: Record<string, Curso>)` | Construye con `Record` |
| `domain/services/recommendationService.ts:31` | `(codigo, cursos: Curso[])` | Construye con `Array` |

Ambas hacen exactamente lo mismo (BFS en grafo de dependencias). Solo hay una diferencia de tipo de entrada. **Debe quedar una sola.**

---

## 3. CAMPO DUPLICADO: `prerequisitos` vs `prerrequisitos`

> [!WARNING]
> Hay un typo histórico que creó un campo duplicado en la interfaz `Curso`.

- `Curso.prerequisitos` → campo **canónico** en `@/core/types/index.ts` (línea 54)
- `CursoEnPlanificador.prerrequisitos` → alias del mundo academic (línea 77)
- `utpExcelAdapter.ts` → **asigna ambos** simultáneamente (líneas 331–332):
  ```ts
  prerequisitos,
  prerrequisitos: prerequisitos,  // duplicado explícito
  ```
- `backupAdapter.ts` → también lee ambos: `c.prerequisitos ?? c.prerrequisitos ?? []`
- `automaticPlanningService.ts` → usa `curso.prerrequisitos` (el typo)
- `validators.ts` → usa `curso.prerequisitos` (el canónico)

**Resultado:** El código funciona pero es frágil. Si se refactoriza uno sin el otro, la validación de prerrequisitos deja de funcionar dependiendo de la ruta.

---

## 4. SHIMS DEPRECADOS que nunca se migraron — Deuda técnica activa

Los siguientes archivos están marcados `@deprecated` pero **siguen siendo usados en producción activamente**:

| Archivo shim | Estado | Archivos que aún lo importan |
|---|---|---|
| `store/useAcademicStore.ts` | `@deprecated` | `NavBar.tsx`, `FinancialDrawer.tsx`, `DisciplineSelector.tsx`, `application/usecases/generateOptimalPlanUseCase.ts` |
| `store/mallaStore.ts` | `@deprecated` | `Homepage.tsx`, `PlannerSection.tsx`, `CicloRow.tsx`, `CursoCard.tsx` |
| `services/backupService.ts` | `@deprecated` | `NavBar.tsx` |
| `utils/finance.ts` | `@deprecated` | `CicloRow.tsx`, `store/selectors.ts` |
| `types/malla.ts` | `@deprecated` | `CicloRow.tsx`, `CursoCard.tsx`, `autoPlannerService.ts`, `validators.ts` |
| `types/academic.ts` | `@deprecated` | `automaticPlanningService.ts`, `recommendationService.ts`, `semesterOptimizationService.ts` |

**Si se elimina cualquiera de estos shims antes de migrar los importadores, el build se rompe.**

---

## 5. INCONSISTENCIA: `NavBar.tsx` importa dos stores para hacer lo mismo

```tsx
// NavBar.tsx líneas 6, 23, 24
import { useMallaStore } from '@/store/mallaStore';
import { useAcademicStore } from '@/store/useAcademicStore';
import { usePlannerStore } from '@/store/plannerStore';
```

- `useMallaStore` y `usePlannerStore` son **el mismo store** (mallaStore re-exporta plannerStore).
- La llamada `useAcademicStore.getState().sincronizarConMalla(...)` en línea 177 es un **no-op** (la función no hace nada en Fase 2).
- Hay **3 imports del store** cuando debería haber **1**.

---

## 6. INCOHERENCIA: `PagoDropdown.tsx` — Componente vacío/stub

```ts
// PagoDropdown.tsx — COMPLETO (3 líneas)
// Re-export de PagoDropdown desde el mismo archivo de dropdowns
export { PagoDropdown } from './FacultadDropdown';
```

`PagoDropdown` se re-exporta desde `FacultadDropdown.tsx` pero **no parece usarse en ningún componente visible activo**. Si el componente existe en `FacultadDropdown`, no tiene sentido tener un archivo proxy de 3 líneas.

---

## 7. COMPONENTE INCOMPLETO: `pdfAdapter.tsx` — Texto en inglés y sin integración

```tsx
// pdfAdapter.tsx línea 14
<Text style={styles.title}>Academic Planner - Proyección académica</Text>
```

- Título mezclado español/inglés.
- El componente `PDFReport` existe pero **no está integrado en ningún lugar de la UI**.
- La clase CSS `nav-action secondary` (línea 34) no corresponde al sistema de clases del proyecto (el proyecto usa `nav-btn`, `nav-btn-export`, etc.).
- `@react-pdf/renderer` es una dependencia pesada (~500KB) que solo se usa en este archivo stub.

---

## 8. COMPONENTE VACÍO: `FinancialTotalCard.tsx` — Sin diseño

```tsx
// FinancialTotalCard.tsx — 9 líneas
export function FinancialTotalCard({ total }: { total: number }) {
  return (
    <div className="financial-total-card">
      <span>Total planificación</span>
      <strong>S/ {(Number(total) || 0).toFixed(2)}</strong>
    </div>
  );
}
```

El `FinancialDrawer` muestra este componente con el total general, pero el CSS `financial-total-card` está en `financial.css` con estilo básico. No hay separación visual clara de las otras tarjetas de periodo.

---

## 9. DEPENDENCIA MUERTA: `@mlc-ai/web-llm`

```json
// package.json línea 21
"@mlc-ai/web-llm": "^0.2.84",
```

Esta dependencia pesa varios MB. **No hay ningún import de `@mlc-ai/web-llm` en todo el código fuente.** Es una dependencia fantasma que aumenta el tamaño del bundle sin aportar nada.

---

## 10. LÓGICA DUPLICADA: `ejecutarMovimiento` llama `moverCurso` + `obtenerTodosCursosRotos` dos veces

En `plannerStore.ts`, `ejecutarMovimiento` (líneas 226–301):

1. Llama `state.moverCurso(codigoCurso, destino)` — actualiza el store.
2. Luego llama `get().asignaciones` — obtiene el estado post-mutación.
3. Hace esto **dos veces** (una en el branch `pozo` y otra en el branch de ciclo) con exactamente el mismo código duplicado (líneas 240–257 y 282–299).

El código duplicado podría extraerse a una función interna.

---

## 11. INCONSISTENCIA: `exportarRespaldo` en plannerStore vs `descargarRespaldoJSON` en backupAdapter

`plannerStore.exportarRespaldo()` (líneas 377–394) construye un objeto `RespaldoMalla` manualmente con `version: '1.0'`. `backupAdapter.serializar()` construye el mismo objeto con `version: '2.0'`. Los dos tienen campos casi idénticos. La función del store debería usar `serializar()` del adapter, no duplicar la construcción.

---

## 12. BUG POTENCIAL: `cicloHelper.ts` hardcodea límite de 10 ciclos

```ts
// cicloHelper.ts línea 36
for (let k = 1; k <= 10; k++) {
```

El planificador soporta hasta 14 ciclos (validado en `plannerStore.setCicloFin`). Si un estudiante tiene cursos en ciclos 11–14, `calcularCicloActual` siempre retornará 10 como máximo, lo que puede hacer que ciclos futuros parezcan desbloqueados cuando no lo están.

---

## 13. BUG POTENCIAL: Tooltip con `id` no único en `CursoCard.tsx`

```tsx
// CursoCard.tsx línea 176
<div id="tooltip-global" ...>
```

Si hay varios `CursoCard` con tooltip visible simultáneamente (imposible hoy por el estado), habría IDs duplicados. Además, usar un ID fijo en un componente de lista es una mala práctica — debería ser `id={`tooltip-${curso.codigo}`}`.

---

## 14. FALTA: `aria-label` duplicado en el input de archivo de `Homepage.tsx`

```tsx
// Homepage.tsx líneas 167-175
<input
  id="home-excel-upload"
  aria-label="Subir archivo Excel de plan de estudios"  // ← duplicado
  ...
/>
```

El `aria-label` del input está duplicado con el del div padre (línea 164). Para inputs ocultos que se activan con un botón, el `aria-label` en el `input` no agrega valor porque el usuario interactúa con el botón/div padre. Debería usar `aria-hidden="true"` en el input oculto.

---

## 15. INCONSISTENCIA DE ESTILOS: Inline styles en `Homepage.tsx`

El botón de demo (líneas 198–211) tiene **14 líneas de estilos inline**:

```tsx
style={{
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#e2e8f0',
  padding: '9px 18px',
  ...
}}
```

El resto de la UI usa clases CSS del sistema de diseño (`tokens.css`, `homepage.css`). Este bloque debería moverse a una clase `.demo-load-btn` en `homepage.css`.

---

## 16. FALTA: Timer leak potencial en `NavBar.tsx`

```ts
// NavBar.tsx líneas 55-56
const exportTimerRef = useRef<number | null>(null);
const accionesTimerRef = useRef<number | null>(null);
```

Los timers de hover (`window.setTimeout`) se guardan en refs pero **no se limpian en el `useEffect` de cleanup**. Si el componente desmonta mientras hay un timer pendiente, puede haber un setState sobre un componente desmontado.

**Fix:** Agregar cleanup en el useEffect:
```ts
return () => {
  document.removeEventListener('mousedown', handleClickOutside);
  if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
  if (accionesTimerRef.current) clearTimeout(accionesTimerRef.current);
};
```

---

## 17. INCONSISTENCIA: `FinancialDrawer` usa `useAcademicStore` y `usePlannerStore` mezclados

```tsx
// FinancialDrawer.tsx líneas 24-33
const { cursos, tarifario, ..., generarPlanificacionOptima } = useAcademicStore();
const pestanaEstrategia = usePlannerStore((s) => s.pestanaEstrategia);
const setPestanaEstrategia = usePlannerStore((s) => s.setPestanaEstrategia);
```

`pestanaEstrategia` **existe en `plannerStore`** pero no está en el shim `useAcademicStore`. Sin embargo, también podría estar accesible mediante `useAcademicStore` si se sincronizara. El componente mezcla ambos stores para acceder a estado que debería venir de un solo lugar.

---

## 18. FALTA: Manejo de error en `FinancialDrawer.handleGenerarPlan`

```tsx
const handleGenerarPlan = async () => {
  setGenerandoAutomatico(true);
  try {
    const res = await generarPlanificacionOptima();
    setResultadoAutomatico(res);
  } finally {
    setGenerandoAutomatico(false);
  }
};
```

No hay `catch`. Si `generarPlanificacionOptima` lanza un error, el componente queda en estado `generandoAutomatico: false` sin ningún feedback de error para el usuario.

---

## 19. INCONSISTENCIA: `vite.config.ts` — Nombre del manifest no coincide con el proyecto

```ts
// vite.config.ts líneas 14-15
name: 'Organizador Curricular Universitario',
short_name: 'AcademicPlanner',
```

El proyecto se llama **"UTP Malla Óptima"** (visible en Homepage, TopBar, y README). El manifest PWA tiene nombres genéricos en inglés que no coinciden con la identidad visual del producto.

---

## 20. FALTA: `vitest` no está instalado

```json
// package.json scripts
"test": "vitest run",
"test:watch": "vitest",
```

`vitest` está referenciado en los scripts pero **no aparece como dependencia en `package.json`** (ni en `dependencies` ni en `devDependencies`). Los tests no pueden correr.

---

## 📋 Resumen Priorizado

| # | Tipo | Archivo(s) | Severidad |
|---|---|---|---|
| 1 | Duplicación de motor de planificación | `autoPlannerService.ts` + `automaticPlanningService.ts` | 🔴 Alta |
| 2 | Función duplicada `calcularImpactoFuturo` | `autoPlannerService.ts` + `recommendationService.ts` | 🔴 Alta |
| 9 | Dependencia muerta `@mlc-ai/web-llm` | `package.json` | 🔴 Alta |
| 20 | `vitest` sin instalar | `package.json` | 🔴 Alta |
| 3 | Campo duplicado `prerequisitos`/`prerrequisitos` | `core/types`, `utpExcelAdapter`, validators | 🟠 Media |
| 4 | Shims deprecados sin migrar | 6 archivos | 🟠 Media |
| 5 | Triple import de stores en NavBar | `NavBar.tsx` | 🟠 Media |
| 10 | Código duplicado en `ejecutarMovimiento` | `plannerStore.ts` | 🟠 Media |
| 11 | `exportarRespaldo` duplica `serializar` | `plannerStore.ts` + `backupAdapter.ts` | 🟠 Media |
| 12 | Límite hardcodeado de 10 ciclos | `cicloHelper.ts` | 🟠 Media |
| 16 | Timer leak en NavBar | `NavBar.tsx` | 🟠 Media |
| 18 | Sin catch en `handleGenerarPlan` | `FinancialDrawer.tsx` | 🟠 Media |
| 6 | `PagoDropdown.tsx` stub innecesario | `PagoDropdown.tsx` | 🟡 Baja |
| 7 | `pdfAdapter.tsx` incompleto/no integrado | `pdfAdapter.tsx` | 🟡 Baja |
| 8 | `FinancialTotalCard` sin diseño propio | `FinancialTotalCard.tsx` | 🟡 Baja |
| 13 | ID de tooltip no único | `CursoCard.tsx` | 🟡 Baja |
| 14 | `aria-label` duplicado en input | `Homepage.tsx` | 🟡 Baja |
| 15 | Estilos inline en botón demo | `Homepage.tsx` | 🟡 Baja |
| 17 | Mezcla de stores en FinancialDrawer | `FinancialDrawer.tsx` | 🟡 Baja |
| 19 | Nombre PWA no coincide | `vite.config.ts` | 🟡 Baja |
