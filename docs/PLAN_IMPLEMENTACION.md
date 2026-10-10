# Plan de Implementación — MallaU
> Rama base: `test/refactor-clean`  
> Nueva rama de trabajo: `feat/frontend-c`

---

## Estrategia de ramas

```
test/refactor-clean  (base estable — no modificar directamente)
        │
        └──► feat/frontend-c          ← rama de integración del equipo
                  │
                  ├── fix/ui-corrections      (Fase 1)
                  ├── feat/exports            (Fase 2)
                  ├── feat/arch-cleanup       (Fase 3)
                  └── feat/ai-integration     (Fase 4 — sub-equipo IA)
```

**Regla de contribución:** nadie trabaja directamente en `feat/frontend-c`.  
Cada sub-rama se integra mediante PR interno con al menos una revisión antes del merge.

---

## Fase 1 — Correcciones críticas de UI/UX
> **Objetivo:** que el planificador se vea y sienta pulido antes de presentar.  
> **Rama:** `fix/ui-corrections`

| # | Tarea | Ref. doc | Criterio de terminado |
|---|---|---|---|
| 1.1 | Quitar scroll horizontal o innecesario del contenedor principal | MallaU·F | El área de la malla no genera scroll que tape contenido útil |
| 1.2 | Mostrar nombre completo del curso en la tarjeta (`CursoCard`) | MallaU·F | El nombre no se trunca en cards de ancho normal; hover muestra tooltip si es muy largo |
| 1.3 | Cambiar `→ ✕` por un ícono neutro en cursos sin descendientes | MallaU·F | Cursos sin `habilitaA[]` muestran un ícono distinto (ej. punto o guión); cursos con descendientes mantienen la flecha |
| 1.4 | Agregar acción rápida de "retirar curso al banco" desde la tarjeta | MallaU·F · RF02 | Un botón/ícono en la card mueve el curso al pozo sin necesidad de drag |
| 1.5 | Acomodar layout de cards (espaciado, alineación, overflow) | MallaU·F | Cards alineadas dentro del ciclo; sin desbordamiento visual en ciclos con muchos cursos |
| 1.6 | Corregir colores del banco de pendientes | MallaU·F | El panel de pendientes usa los tokens de color correctos (`tokens.css`), sin colores hardcodeados |
| 1.7 | Eliminar etiqueta "Aprobado" redundante en cursos aprobados | MallaU·F · RF04 | El estado se muestra una sola vez (por color o badge), nunca duplicado |
| 1.8 | Corregir texto "historial" → "aprobado" en el tutorial | MallaU·F | El tutorial usa terminología consistente con el resto de la UI |
| 1.9 | Devolver selector de tarifario y facultad al NavBar | MallaU·F · RF08 | `FacultadDropdown` visible en la barra de navegación principal |
| 1.10 | Reemplazar `alert()` nativo por toast del sistema | MallaU·F | Ningún `alert()` / `window.alert()` en el código; se usa `ToastContainer` existente |
| 1.11 | Renombrar "Facultad / tarifario" → "Facultad" en el selector | MallaU·F | El label visible dice solo "Facultad" |
| 1.12 | Conectar método de pago seleccionado al simulador de costos | MallaU·F · RF09 · RN03 | Al cambiar el método de pago en NavBar, el `FinancialDrawer` lo refleja en tiempo real |
| 1.13 | Definir y aplicar la nueva paleta de colores | MallaU·F | Tokens en `tokens.css` actualizados; ningún color hardcodeado fuera de ese archivo |
| 1.14 | Reemplazar logo/vector de página por uno académico | MallaU·F | El ícono en TopBar y favicon refleja temática académica |

---

## Fase 2 — Motor y Exportaciones
> **Objetivo:** cerrar los requerimientos de exportación (RF13) y reglas de verano pendientes (RF10 · RN06).  
> **Rama:** `feat/exports`

| # | Tarea | Ref. doc | Criterio de terminado |
|---|---|---|---|
| 2.1 | Ciclos de verano visibles solo desde el ciclo lectivo actual en adelante | MallaU·B · RF10 · RN06 | El usuario no puede ver ni asignar cursos a veranos de ciclos ya completados |
| 2.2 | Corregir vistas del PDF exportado | MallaU·B · RF13 | El PDF muestra tabla de ciclos, cursos, costo por ciclo, total y método de pago sin recortes |
| 2.3 | Corregir el PNG exportado | MallaU·B · RF13 | El PNG captura la malla visible sin cortes ni scroll incorrecto |
| 2.4 | PNG incluye: ciclo activo, listado de cursos, costo general, método de pago y solo ciclos del rango de visualización seleccionado | MallaU·B · RF13 | El PNG respeta el filtro de ciclos visibles |

**Nota:** el PNG usa `exportPlanPNG.ts` ya existente; el bug está en que no respeta el rango de ciclos. El PDF usa `@react-pdf/renderer` ya instalado.

---

## Fase 3 — Arquitectura y Extensibilidad
> **Objetivo:** preparar el proyecto para contribuciones open source (otras universidades) y para recibir el módulo IA.  
> **Rama:** `feat/arch-cleanup`

| # | Tarea | Ref. CAMBIOS | Criterio de terminado |
|---|---|---|---|
| 3.1 | Reemplazar `xlsx` por versión segura o `read-excel-file` | C17 🔴 | `pnpm audit` sin vulnerabilidades críticas en el parser de Excel |
| 3.2 | Definir puertos de repositorio (`CourseRepository`, `ProfileRepository`) en `infrastructure/` | C2 🔴 | `grep -r "services/db" src` devuelve solo archivos de `infrastructure/` |
| 3.3 | Eliminar duplicación del perfil: un solo `profileRepo.save(cambios)` | C4 🔴 | `fechaActualizacion: new Date()` aparece una sola vez |
| 3.4 | Mover defaults hardcodeados (`pe-utp`, nombre de carrera) a `config/defaultProfile.ts` | C5 🟡 | Ni `'pe-utp'` ni nombre de carrera aparecen en `store/` |
| 3.5 | Activar `AdapterRegistry` con `UtpExcelAdapter` registrado | C7 🟡 | El código de carga de Excel usa `adapterRegistry.get(universidadId)` |
| 3.6 | Hacer extensible `FinancialConfigurationProvider` con `register()` | C8 🟡 | Agregar universidad = agregar archivos + una línea de registro |
| 3.7 | Mover `budgetEngine.ts` → `financial/engine/` y `academicGraph.ts` → `domain/services/` | C10 🟡 | `utils/` no importa de `domain/` ni de `financial/` |
| 3.8 | Quitar `formatCredits` del dominio; devolver objetos tipados | C11 🟡 | `automaticPlanningService` no importa funciones de formato |
| 3.9 | Una sola fuente de límites académicos: desde `AcademicConfigLoader` | C12 🟡 | Cambiar un límite en el JSON cambia el comportamiento sin tocar código |
| 3.10 | Selectores granulares en `CicloRow` y `CursoCard` | C13 🟡 | Mover un curso no re-renderiza tarjetas de otros ciclos |
| 3.11 | Dividir `App.tsx` a < 80 líneas; extraer hooks (`useTheme`, `useTutorialState`) | C15 🟡 | `App.tsx` solo compone componentes, sin lógica propia |
| 3.12 | Validar respaldo JSON con Zod antes de importar | C19 🟢 | `importAcademicBackup.ts` no usa `as RawAcademicBackup` sin validar |
| 3.13 | Centralizar claves de `localStorage` en `config/storageKeys.ts` | C20 🟢 | Ninguna clave de storage hardcodeada fuera de ese archivo |

---

## Fase 4 — Integración de IA (DeepSeek)
> **Objetivo:** implementar el Asesor Académico con IA (RF12).  
> **Rama:** `feat/ai-integration`  
> **Requisito previo:** Fase 3 completada.  
> **Responsable:** sub-equipo de IA.

### Estructura de archivos a crear

```
src/ai/
├── contracts.ts              ← mover de src/domain/ai/ai-contracts.ts
├── AIService.ts              ← mover de src/services/ai-service.ts
├── contextBuilder.ts         ← REESCRIBIR con tipos reales (ver más abajo)
├── providers/
│   ├── MockAIProvider.ts     ← mover de src/infrastructure/providers/MockAIProvider.ts
│   └── DeepSeekProvider.ts   ← NUEVO: llamada REST a api.deepseek.com
└── components/
    ├── AIAssistantDrawer.tsx  ← NUEVO: panel lateral de chat
    ├── ChatMessage.tsx        ← NUEVO: burbuja de mensaje
    └── CourseChip.tsx         ← NUEVO: pastilla de curso evidencia
```

### Archivos a modificar

| Archivo | Qué agregar |
|---|---|
| `src/store/plannerStore.ts` | `aiDrawerOpen: boolean` y `setAiDrawerOpen` en el slice `ui` |
| `src/components/layout/NavBar.tsx` | Botón que abre `AIAssistantDrawer` |
| `src/App.tsx` | Montar `<AIAssistantDrawer />` junto al resto de drawers |

### Archivos a eliminar

| Archivo | Motivo |
|---|---|
| `src/domain/ai/ai-contracts.ts` | Reemplazado por `src/ai/contracts.ts` |
| `src/services/ai-context-builder.ts` | Usa tipos inventados; reemplazado por `src/ai/contextBuilder.ts` |
| `src/services/ai-service.ts` | Reemplazado por `src/ai/AIService.ts` |
| `src/infrastructure/providers/MockAIProvider.ts` | Reemplazado por `src/ai/providers/MockAIProvider.ts` |
| `package-lock.json` | El proyecto usa `pnpm`; este archivo es ruido |

### Eliminar de `package.json`

```json
"@mlc-ai/web-llm": "^0.2.84"   ← no hay ningún WebLLMProvider implementado
```

### contextBuilder correcto (tipos reales del store)

```typescript
// src/ai/contextBuilder.ts
import type { AIContextV1 } from './contracts';
import type { PlannerState } from '@/store/plannerStore';
import { calcularCicloActual } from '@/utils/cicloHelper';

type StoreSnapshot = Pick<PlannerState,
  | 'cursos'           // Record<string, Curso>
  | 'asignaciones'     // Record<string, 'ciclo-N' | 'verano-N' | 'pozo'>
  | 'cicloInicio'
  | 'cicloFin'
  | 'periodoIngreso'
  | 'veranosHabilitados'
>;

export function buildAIContext(
  state: StoreSnapshot,
  snapshotId: string,
  timestamp: Date,
): AIContextV1 {
  const cicloActual = calcularCicloActual(state.cursos);

  return {
    snapshotId,
    generatedAt: timestamp.toISOString(),
    academicContext: {
      periodoIngreso: state.periodoIngreso,
      cicloActual,
      totalCiclos: state.cicloFin,
      veranosPermitidosTras: Object.entries(state.veranosHabilitados)
        .filter(([, v]) => v)
        .map(([k]) => Number(k)),
      periodosBloqueados: [],
    },
    courses: Object.values(state.cursos).map((curso) => {
      const ubi = state.asignaciones[curso.codigo] ?? 'pozo';
      return {
        codigo:         curso.codigo,
        nombre:         curso.nombre,
        estado:         curso.estado,
        cicloOrigen:    curso.cicloOrigen,
        cicloAsignado:  ubi === 'pozo'
          ? curso.cicloOrigen
          : parseInt(ubi.replace(/ciclo-|verano-/, ''), 10),
        tipoPeriodo:    ubi.startsWith('verano') ? 'VERANO' : 'REGULAR',
        ubicacion:      ubi === 'pozo' ? 'banco' : 'periodo',
        creditos:       curso.creditos,
        horasSemanales: curso.horasSemanales,
        // Ojo: el campo canónico en core/types se llama 'prerequisitos' (sin 'r' extra)
        prerrequisitos: [...curso.prerequisitos],
      };
    }),
  };
}
```

### Reglas para el sub-equipo de IA

1. **La API key la ingresa el usuario** y se guarda en `localStorage` con la clave `mallau-deepseek-key`. Nunca en `.env` ni en código fuente.
2. **El chat envía la malla completa** al contexto. El `systemPrompt` le indica al modelo que sus recomendaciones sean **solo para ciclos futuros** al `cicloActual`.
3. **El chat no modifica la malla directamente.** Solo recomienda. El estudiante aplica los cambios manualmente.
4. **No instalar modelos locales.** El proveedor real es DeepSeek vía REST (`api.deepseek.com`).
5. **Fallback offline:** si no hay API key configurada, el `AIAssistantDrawer` usa `MockAIProvider` automáticamente y muestra un badge "Modo Demo".

---

## Tabla de Seguimiento

| Fase | # | Tarea | Estado | Responsable | PR |
|---|---|---|---|---|---|
| 1 | 1.1 | Quitar scroll | ⬜ Pendiente | — | — |
| 1 | 1.2 | Nombre completo en card | ⬜ Pendiente | — | — |
| 1 | 1.3 | Ícono cursos sin descendientes | ⬜ Pendiente | — | — |
| 1 | 1.4 | Retirar curso rápido | ⬜ Pendiente | — | — |
| 1 | 1.5 | Layout de cards | ⬜ Pendiente | — | — |
| 1 | 1.6 | Colores banco pendientes | ⬜ Pendiente | — | — |
| 1 | 1.7 | "Aprobado" redundante | ⬜ Pendiente | — | — |
| 1 | 1.8 | Tutorial: "historial" → "aprobado" | ⬜ Pendiente | — | — |
| 1 | 1.9 | Tarifario y facultad en NavBar | ⬜ Pendiente | — | — |
| 1 | 1.10 | `alert()` → toast | ⬜ Pendiente | — | — |
| 1 | 1.11 | Label "Facultad" | ⬜ Pendiente | — | — |
| 1 | 1.12 | Método de pago → simulador | ⬜ Pendiente | — | — |
| 1 | 1.13 | Nueva paleta de colores | ⬜ Pendiente | — | — |
| 1 | 1.14 | Logo académico | ⬜ Pendiente | — | — |
| 2 | 2.1 | Verano desde ciclo actual | ⬜ Pendiente | — | — |
| 2 | 2.2 | PDF corregido | ⬜ Pendiente | — | — |
| 2 | 2.3 | PNG corregido | ⬜ Pendiente | — | — |
| 2 | 2.4 | PNG con filtro de ciclos | ⬜ Pendiente | — | — |
| 3 | 3.1 | xlsx → versión segura | ⬜ Pendiente | — | — |
| 3 | 3.2 | Repositorios (puertos) | ⬜ Pendiente | — | — |
| 3 | 3.3 | profileRepo.save unificado | ⬜ Pendiente | — | — |
| 3 | 3.4 | Defaults en config/ | ⬜ Pendiente | — | — |
| 3 | 3.5 | AdapterRegistry activo | ⬜ Pendiente | — | — |
| 3 | 3.6 | FinancialConfigProvider extensible | ⬜ Pendiente | — | — |
| 3 | 3.7 | Reubicar budgetEngine / academicGraph | ⬜ Pendiente | — | — |
| 3 | 3.8 | formatCredits fuera del dominio | ⬜ Pendiente | — | — |
| 3 | 3.9 | Límites desde JSON de config | ⬜ Pendiente | — | — |
| 3 | 3.10 | Selectores granulares Zustand | ⬜ Pendiente | — | — |
| 3 | 3.11 | App.tsx < 80 líneas | ⬜ Pendiente | — | — |
| 3 | 3.12 | Validar backup con Zod | ⬜ Pendiente | — | — |
| 3 | 3.13 | Claves localStorage centralizadas | ⬜ Pendiente | — | — |
| 4 | 4.1 | Crear `src/ai/` con estructura | ⬜ Pendiente | Sub-equipo IA | — |
| 4 | 4.2 | `DeepSeekProvider` | ⬜ Pendiente | Sub-equipo IA | — |
| 4 | 4.3 | `contextBuilder` con tipos reales | ⬜ Pendiente | Sub-equipo IA | — |
| 4 | 4.4 | `AIAssistantDrawer` (UI chat) | ⬜ Pendiente | Sub-equipo IA | — |
| 4 | 4.5 | Eliminar archivos duplicados de IA | ⬜ Pendiente | Sub-equipo IA | — |
| 4 | 4.6 | Eliminar `@mlc-ai/web-llm` | ⬜ Pendiente | Sub-equipo IA | — |

**Estados:** ⬜ Pendiente · 🔄 En progreso · ✅ Terminado · 🚫 Bloqueado

---

## Checklist de entrega de cada PR

- [ ] `pnpm build` sin errores de TypeScript
- [ ] `pnpm lint` sin warnings nuevos
- [ ] Ningún `any` nuevo en TypeScript
- [ ] Ningún `console.log` de depuración temporal
- [ ] Ningún `alert()` nativo
- [ ] El cambio está marcado como 🔄 En progreso → ✅ Terminado en esta tabla
