# Cambios recomendados — `utp-malla-optima`

> **Alcance:** solo cambios de código y arquitectura.
> **Fuera de alcance por ahora:** tests, CI/CD, workflows y documentación.

Cada cambio indica **prioridad**, **problema**, **qué hacer** y **criterio de terminado**.

| Prioridad | Significado |
|---|---|
| 🔴 Alta | Afecta mantenibilidad o puede causar bugs/pérdida de datos |
| 🟡 Media | Mejora la arquitectura y reduce deuda técnica |
| 🟢 Baja | Limpieza y consistencia |

---

## Índice de cambios

| # | Cambio | Prioridad | Principio |
|---|---|---|---|
| 1 | Partir `useAcademicStore` (God Store) | 🔴 | SRP / ISP |
| 2 | Introducir repositorios en lugar de usar `db` directo | 🔴 | DIP |
| 3 | Persistir antes (o con rollback) de confirmar el estado | 🔴 | Robustez |
| 4 | Eliminar la duplicación del `db.profile.put(...)` | 🔴 | DRY |
| 5 | Mover los defaults hardcodeados (`pe-utp`, carrera) a configuración | 🟡 | OCP |
| 6 | Sacar el mapeo de notificaciones fuera del store | 🟡 | SRP |
| 7 | Usar o eliminar `AdapterRegistry` | 🟡 | Código muerto |
| 8 | Hacer extensible la configuración financiera | 🟡 | OCP |
| 9 | Reemplazar servicios estáticos por instancias inyectables | 🟡 | DIP |
| 10 | Reubicar `utils/budgetEngine` y `utils/academicGraph` | 🟡 | Capas |
| 11 | Quitar `formatCredits` del dominio | 🟡 | Capas |
| 12 | Unificar constantes del dominio con la configuración | 🟡 | Fuente única de verdad |
| 13 | Usar selectores de Zustand | 🟡 | Rendimiento |
| 14 | Extraer la migración de datos fuera de `cargarDesdeDB` | 🟡 | SRP |
| 15 | Dividir `App.tsx` | 🟡 | SRP |
| 16 | Dividir `automaticPlanningService.ts` | 🟡 | SRP |
| 17 | Reemplazar la dependencia `xlsx` | 🔴 | Seguridad |
| 18 | Corregir los íconos de la PWA | 🟡 | Build |
| 19 | Validar el respaldo antes de castear | 🟢 | Seguridad de tipos |
| 20 | Limpiezas menores (nombres, ternaria, `console.error`) | 🟢 | Consistencia |
| 21 | Unificar el enfoque de estilos (CSS vs Tailwind) | 🟢 | Consistencia |

---

## 1. Partir `useAcademicStore` (God Store) 🔴

**Problema.** `src/store/useAcademicStore.ts` tiene ~596 líneas y mezcla estado de UI, estado de dominio, persistencia (35 llamadas a `db.`) y mapeo a mensajes de usuario.

**Qué hacer.** Dividir en stores con una sola responsabilidad:

```
src/store/
├── useCoursesStore.ts     # cursos, mover/estado, planificación
├── useProfileStore.ts     # periodoIngreso, cicloActual, totalCiclos, ciclosExcluidos, disciplina
├── useUiStore.ts          # panelPlanificadorAbierto, cursoAMover, notificacionMovimiento
└── useFinancialStore.ts   # tarifario (o dejarlo en profile)
```

Regla: **los stores no conocen Dexie** (ver cambio 2) y **no contienen textos de UI** (ver cambio 6).

**Terminado cuando:** ningún archivo de `store/` supera ~200 líneas y ninguno importa `services/db`.

---

## 2. Introducir repositorios en lugar de usar `db` directo 🔴

**Problema.** Store y casos de uso dependen de la implementación concreta (Dexie). Eso rompe el principio de inversión de dependencias y obliga a tocar el store si cambia la persistencia.

**Qué hacer.** Definir contratos en `application/` e implementarlos en `infrastructure/`:

```ts
// src/application/ports/CourseRepository.ts
import type { Curso } from '../../types/academic';

export interface CourseRepository {
  getAll(): Promise<Curso[]>;
  replaceAll(cursos: Curso[]): Promise<void>;
  update(codigo: string, cambios: Partial<Curso>): Promise<void>;
  saveMany(cursos: Curso[]): Promise<void>;
}

// src/application/ports/ProfileRepository.ts
import type { UserAcademicProfile } from '../../types/profile';

export interface ProfileRepository {
  get(): Promise<UserAcademicProfile | undefined>;
  save(cambios: Partial<UserAcademicProfile>): Promise<void>; // ver cambio 4
}
```

```ts
// src/infrastructure/persistence/DexieCourseRepository.ts
export class DexieCourseRepository implements CourseRepository {
  constructor(private readonly db: AcademicDatabase) {}
  getAll() { return this.db.courses.toArray(); }
  replaceAll(cursos: Curso[]) {
    return this.db.transaction('rw', this.db.courses, async () => {
      await this.db.courses.clear();
      await this.db.courses.bulkPut(cursos);
    });
  }
  // ...
}
```

Componer en un único punto (`src/main.tsx` o `src/composition.ts`) y pasar los repositorios a los stores (factory) o a casos de uso.

**Nota:** `UserAcademicProfile` hoy vive en `services/db.ts`. Muévelo a `types/profile.ts` para que el dominio no importe de infraestructura.

**Terminado cuando:** `grep -r "services/db" src` solo devuelve archivos de `infrastructure/`.

---

## 3. Persistir antes (o con rollback) de confirmar el estado 🔴

**Problema.** El patrón actual es:

```ts
set({ cursos: cursosActualizados });   // la UI ya cambió
await db.courses.update(codigo, {...}); // si esto falla, la UI miente
```

Si IndexedDB falla (cuota llena, modo privado, bloqueo), el usuario ve un plan que no se guardó y lo pierde al recargar.

**Qué hacer.** Elegir una de las dos estrategias y aplicarla en **todas** las acciones:

```ts
// Opción A — persistir primero
await courseRepo.update(codigo, cambios);
set({ cursos: cursosActualizados });

// Opción B — optimista con rollback
const previos = get().cursos;
set({ cursos: cursosActualizados });
try {
  await courseRepo.update(codigo, cambios);
} catch (error) {
  set({ cursos: previos, notificacionMovimiento: { tipo: 'ERROR_PERSISTENCIA', ... } });
  throw error;
}
```

La opción B conserva la sensación de respuesta inmediata; la A es más simple. Añadir un tipo `ERROR_PERSISTENCIA` a `TipoNotificacionMovimiento`.

**Terminado cuando:** ninguna acción hace `set(...)` y luego `await` de escritura sin manejar el fallo.

---

## 4. Eliminar la duplicación del `db.profile.put(...)` 🔴

**Problema.** El bloque que reconstruye el perfil completo (con `universidadId`, `carrera`, `disciplinaActiva`, `fechaActualizacion`, etc.) se repite unas 6 veces en `setTotalCiclos`, `eliminarCiclo`, `setContextoAcademico`, `setCursos`, `setDisciplinaActiva` e `importarCursos`. Cada copia puede divergir.

**Qué hacer.** Un único método de guardado parcial en el repositorio:

```ts
// ProfileRepository (implementación Dexie)
async save(cambios: Partial<UserAcademicProfile>) {
  const actual = await this.db.profile.get(PROFILE_ID);
  await this.db.profile.put({
    ...DEFAULT_PROFILE,
    ...actual,
    ...cambios,
    id: PROFILE_ID,
    fechaActualizacion: new Date().toISOString(),
  });
}
```

Uso en el store:

```ts
await profileRepo.save({ totalCiclos, ciclosExcluidos });
```

**Terminado cuando:** `fechaActualizacion: new Date()` aparece una sola vez en el código.

---

## 5. Mover los defaults hardcodeados a configuración 🟡

**Problema.** `'pe-utp'` y `'Ingeniería de Sistemas e Informática'` están escritos en el store como valores de respaldo. Cualquier otra universidad o carrera obliga a editar el store.

**Qué hacer.**

```ts
// src/config/defaultProfile.ts
export const DEFAULT_PROFILE = {
  universidadId: university.universidadId, // viene de UniversityConfigLoader
  carrera: 'Ingeniería de Sistemas e Informática',
} as const;
```

Idealmente la carrera viene del Excel cargado o de la configuración de universidad (`university.json`), no de una constante en el código.

**Terminado cuando:** ni `'pe-utp'` ni el nombre de la carrera aparecen en `store/`.

---

## 6. Sacar el mapeo de notificaciones fuera del store 🟡

**Problema.** `notificacionDesdeResultado` contiene textos en español y formateo (`formatCredits`) dentro del store. Es lógica de presentación.

**Qué hacer.** Moverla a un módulo de presentación:

```
src/presentation/messages/movementMessages.ts
```

El store solo guarda el **resultado del dominio** (`{ reason, curso, periodo, ... }`) y el componente `PrerequisitoToast` lo traduce a texto. Beneficio extra: facilita traducir o cambiar mensajes sin tocar el estado.

**Terminado cuando:** el store no importa `formatCredits` ni contiene frases en lenguaje natural.

---

## 7. Usar o eliminar `AdapterRegistry` 🟡

**Problema.** `src/adapters/AdapterRegistry.ts` y `CurriculumAdapter.ts` no se usan en ningún archivo. `FileUpLoad.tsx` importa `parseUTPExcel` directamente. Hay una abstracción diseñada que el código ignora.

**Qué hacer (elegir una):**

- **Opción A (recomendada si habrá más universidades):** convertir `utpExcelAdapter` en una clase que implemente `CurriculumAdapter`, registrarla en la composición y que `FileUpload` pida el adapter por `universidadId`.

```ts
// composition
adapterRegistry.register(new UtpExcelAdapter());

// FileUpload
const adapter = adapterRegistry.get(tarifario.universidadId);
const cursos = await adapter.parse(file);
```

- **Opción B:** si no habrá más universidades a corto plazo, eliminar ambos archivos y volver a añadirlos cuando exista un segundo adapter (YAGNI).

**Terminado cuando:** no queda código sin referencias.

---

## 8. Hacer extensible la configuración financiera 🟡

**Problema.** `FinancialConfigurationProvider.load()` llama directamente a `UtpFinancialConfigProvider`. Y `UniversityFinancialRulesProvider` tiene una lista cerrada (`REGISTRATIONS`) con un alias temporal `utp-2026`. Agregar otra universidad exige editar ambos.

**Qué hacer.**

1. Definir una interfaz:

```ts
export interface FinancialConfigSource {
  readonly reglasFinancierasId: string;
  load(selection: { sedeId: string; tarifarioVersion: string }): FinancialConfig;
}
```

2. Registrar las fuentes y las reglas en un registro con `register()` (como `AdapterRegistry`), en vez de arrays constantes dentro de la clase.
3. Retirar el alias `utp-2026` cuando ya no existan datos persistidos con ese id (la migración `migrateLegacyFinancialRulesReference` ya lo convierte a `utp`).

**Terminado cuando:** agregar una universidad nueva = agregar archivos nuevos + una línea de registro, sin editar clases existentes.

---

## 9. Reemplazar servicios estáticos por instancias inyectables 🟡

**Problema.** `FinancialPlanningService.calcular(...)` y `UniversityFinancialRulesProvider.resolve(...)` son métodos `static`. Los componentes quedan acoplados a la implementación concreta y no se pueden sustituir.

**Qué hacer.**

```ts
export class FinancialPlanningService {
  constructor(private readonly rulesProvider: FinancialRulesProvider) {}

  calcular(cursos, tarifario, disciplina, opciones = {}): FinancialSummary {
    const rules = this.rulesProvider.resolve({
      universidadId: tarifario.universidadId,
      reglasFinancierasId: tarifario.reglasFinancierasId,
    });
    return new FinancialEngine(rules).calcular(cursos, tarifario, disciplina, opciones);
  }
}
```

Exponerlo con un contexto de React o un hook (`useFinancialPlanning()`).

También tipar `opciones` en `UtpFinancialRules.calcular` (hoy `opciones = {}` sin tipo) y evitar depender de `cursos[0]?.tipoPeriodo`: recibir `tipoPeriodo` explícito en las opciones.

---

## 10. Reubicar `utils/budgetEngine` y `utils/academicGraph` 🟡

**Problema.** Ambos contienen lógica de negocio pero viven en `utils/`. `academicGraph` además importa de `domain/`, invirtiendo la dirección de dependencias esperada.

**Qué hacer.**

| Archivo actual | Destino |
|---|---|
| `utils/academicGraph.ts` | `domain/services/prerequisiteService.ts` |
| `utils/budgetEngine.ts` | `financial/engine/budgetCalculator.ts` |

Actualizar imports en `moveCourseUseCase`, `UtpFinancialRules`, etc. Dejar en `utils/` solo helpers realmente genéricos.

**Terminado cuando:** `utils/` no importa de `domain/` ni de `financial/`.

---

## 11. Quitar `formatCredits` del dominio 🟡

**Problema.** `domain/services/automaticPlanningService.ts` importa `formatCredits` de `utils/`. El dominio no debería formatear texto de presentación.

**Qué hacer.** Que el servicio devuelva datos (números y códigos de motivo) y que la UI construya el texto. Para `explicacion: string[]` y `motivos: string[]`, devolver objetos tipados:

```ts
type MotivoNoPlanificado =
  | { tipo: 'HORAS_INVALIDAS' }
  | { tipo: 'DEPENDENCIA_CIRCULAR' }
  | { tipo: 'REQUISITO_FUERA_DE_RANGO'; requisito: CursoReferencia; periodo?: PeriodoAcademico }
  | { tipo: 'SIN_ESPACIO'; cicloFinal: number; limiteHoras: number };
```

Y reutilizar la capa de mensajes del cambio 6.

---

## 12. Unificar constantes del dominio con la configuración 🟡

**Problema.** Hay dos fuentes de verdad:

- `planningRules.ts`: `LIMITE_HORAS_PERIODO = 24`, `LIMITE_HORAS_PLANIFICACION = 22`, `LIMITE_CREDITOS_VERANO = 11`, `FACTOR_HORAS_VERANO = 2`, `MINIMO_CREDITOS_ELECTIVOS = 3`.
- La configuración académica (`academic.json` → `limitesAcademicos`, `verano.multiplicadorHorasTarifarias`).

Además `CICLO_MAXIMO = 10` en `utpExcelAdapter.ts` duplica a `MAXIMO_CICLOS` de `cycleRules.ts`.

**Qué hacer.**

1. Definir una interfaz `AcademicLimits` y leerla de `AcademicConfigLoader`.
2. Pasar los límites como parámetro a las reglas (`validarLimiteHorasPeriodo(cursos, tipo, limites)`) en lugar de importar constantes.
3. Dejar un solo `MAXIMO_CICLOS` y que el adapter lo importe.

**Terminado cuando:** cambiar un límite en el JSON cambia el comportamiento de la app sin tocar código.

---

## 13. Usar selectores de Zustand 🟡

**Problema.** Los componentes hacen `const { cursos, ... } = useAcademicStore()`, lo que los suscribe a **todo** el store. `CicloRow` (que se renderiza muchas veces) se re-renderiza ante cualquier cambio.

**Qué hacer.**

```ts
import { useShallow } from 'zustand/react/shallow';

const cursos = useCoursesStore((s) => s.cursos);
const { moverCursoAPeriodo, eliminarCiclo } = useCoursesStore(
  useShallow((s) => ({ moverCursoAPeriodo: s.moverCursoAPeriodo, eliminarCiclo: s.eliminarCiclo }))
);
```

Además, en `CicloRow` calcular `periodoActual` y `periodoEnCurso` con `useMemo`, o moverlos a un selector derivado.

---

## 14. Extraer la migración de datos fuera de `cargarDesdeDB` 🟡

**Problema.** `cargarDesdeDB` carga, detecta si hace falta migrar (`ubicacion === 'ciclo'`, falta `cicloOrigen`, etc.), normaliza y vuelve a escribir. Esa migración ya existe parcialmente en Dexie (`version(5).upgrade`) y se repite en el store.

**Qué hacer.**

- Dejar las migraciones de esquema **solo** en `db.version(n).upgrade(...)`.
- Que `cargarDesdeDB` solo lea y normalice en memoria (`normalizarCurso`), sin decidir ni ejecutar migraciones.
- Si falta una migración, agregar `version(7)` en lugar de parchear en el store.

---

## 15. Dividir `App.tsx` 🟡

**Problema.** `App.tsx` (~199 líneas de JSX muy denso) mezcla tema, localStorage, tutorial, medición de altura del chrome, barra superior, navegación, cálculo de estadísticas y modales.

**Qué hacer.**

```
src/hooks/
├── useTheme.ts              # tema + localStorage
├── useTutorialState.ts      # tutorialCompletado + localStorage
└── useChromeHeight.ts       # ResizeObserver → --chrome-h

src/components/layout/
├── TopBar.tsx
├── MainNav.tsx
├── ProgressSummary.tsx      # llevados / planificados / pendientes / electivos
└── UploadModal.tsx
```

Mover los cálculos derivados (`pendientesBanco`, `llevados`, `creditosElectivos`) a un selector o hook (`useProgressSummary`).

**Terminado cuando:** `App.tsx` queda por debajo de ~80 líneas y solo compone.

---

## 16. Dividir `automaticPlanningService.ts` 🟡

**Problema.** 306 líneas con varias responsabilidades: validar prerrequisitos, detectar ciclos, calcular motivos de fallo, colocar cursos y armar el resumen.

**Qué hacer.**

```
domain/services/planning/
├── prerequisiteChecks.ts      # requisitoCumplidoAntesDe, prerrequisitosCumplidos
├── circularDependency.ts      # tieneDependenciaCircular
├── unplannedReasons.ts        # motivosNoPlanificado (devolviendo tipos, ver cambio 11)
├── planBuilder.ts             # generarPlanificacionAutomatica
└── types.ts                   # ResultadoPlanificacionAutomatica y afines
```

Corregir de paso `tieneDependenciaCircular`: crea `new Set([...camino, actual])` en cada llamada recursiva (O(n²) en cadenas largas) y cachea resultados parciales dentro de un recorrido en curso, lo que puede dar falsos negativos. Un DFS con tres colores (blanco/gris/negro) es más correcto y eficiente.

---

## 17. Reemplazar la dependencia `xlsx` 🔴

**Problema.** `xlsx@0.18.5` (la versión publicada en npm) tiene vulnerabilidades conocidas (prototype pollution y ReDoS) y no recibe parches ahí. La app procesa archivos subidos por el usuario, que es justo el vector de riesgo.

**Qué hacer (elegir una):**

- Instalar la versión mantenida de SheetJS desde su distribución oficial (`https://cdn.sheetjs.com/`).
- Migrar a `exceljs` o `read-excel-file`, que cubren la lectura que necesitas (solo lees, no escribes).

Como el parser está aislado en `utpExcelAdapter.ts`, el cambio queda contenido en un archivo. Aprovechar para limitar el tamaño del archivo aceptado (p. ej. 5 MB) antes de parsearlo en `FileUpload`.

---

## 18. Corregir los íconos de la PWA 🟡

**Problema.** `vite.config.ts` referencia `pwa-192x192.png`, `pwa-512x512.png`, `favicon.ico` y `apple-touch-icon.png`, pero `public/` solo contiene `favicon.svg` e `icons.svg`. El manifest apunta a archivos inexistentes.

**Qué hacer.**

- Generar los PNG (192, 512 y uno maskable) y colocarlos en `public/`, o
- Usar `@vite-pwa/assets-generator` a partir de `favicon.svg`.
- Ajustar `includeAssets` a lo que realmente exista.

---

## 19. Validar el respaldo antes de castear 🟢

**Problema.** En `importAcademicBackup.ts`:

```ts
const data = JSON.parse(text) as RawAcademicBackup;
```

El `as` afirma un tipo sin comprobarlo. Hoy los campos son `unknown`, así que es relativamente seguro, pero es fácil romperlo al añadir campos.

**Qué hacer.** Parsear con un esquema Zod (ya lo usas en el resto de la app):

```ts
const RawBackupSchema = z.object({
  version: z.union([z.number(), z.string()]).optional(),
  cursos: z.unknown(),
  tarifario: z.unknown().optional(),
  // ...
});
const data = RawBackupSchema.parse(JSON.parse(text));
```

Y reemplazar los `throw new Error('...')` sueltos por un tipo de error propio (`BackupImportError`) con código, para que la UI pueda distinguir causas.

---

## 20. Limpiezas menores 🟢

| Qué | Dónde | Acción |
|---|---|---|
| Nombre de archivo mal capitalizado | `components/FileUpLoad.tsx` (exporta `FileUpload`) | Renombrar a `FileUpload.tsx` (en Windows/Linux puede romper imports) |
| Ternaria con ramas idénticas | `CicloRow.tsx`: `tipoPeriodo === 'REGULAR' ? numCiclo < cicloActual : numCiclo < cicloActual` | Simplificar a `numCiclo < cicloActual` |
| `console.error` suelto | `FileUpLoad.tsx` | Reemplazar por un logger mínimo (`src/utils/logger.ts`) |
| Mezcla de español e inglés | `moveCourseUseCase` vs `cursoBloqueado`, razones `'PAST_PERIOD'` vs nombres en español | Elegir un idioma para el código (recomendado: inglés para identificadores, español para textos de UI) |
| Nombre de paquete | `package.json` → `"name": "mallau"` | Alinear con el nombre del repo o de la app |
| Constante de tema/tutorial en `localStorage` | `App.tsx` (claves `'mallau-theme'`, `'mallau-tutorial-completado'`) | Centralizar claves en `config/storageKeys.ts` |
| Parámetros opcionales sin tipo | `UtpFinancialRules.calcular(..., opciones = {})` | Tipar con `FinancialEngineOptions` |
| `!` (non-null assertion) | Store: `get().cicloActual!`, `.find(...)!` | Reemplazar por guardas o por una función que devuelva el valor ya validado |

---

## 21. Unificar el enfoque de estilos 🟢

**Problema.** Tienes Tailwind v4 instalado (`tailwindcss`, `@tailwindcss/vite`), pero los estilos están en ~15 archivos CSS globales (`src/styles/*.css`, ~170 KB). Conviven dos enfoques y se paga el costo de ambos.

**Qué hacer (elegir una):**

- **Quedarse con CSS propio:** quitar Tailwind de dependencias y del plugin de Vite.
- **Migrar a Tailwind:** hacerlo de forma gradual, componente por componente.
- **Alternativa intermedia:** CSS Modules por componente (`CicloRow.module.css`) para eliminar colisiones de nombres globales.

Antes de decidir, verificar con `grep` si alguna clase de Tailwind se usa realmente.

---

## Orden sugerido de ejecución

1. **Seguridad y robustez:** 17 (xlsx) → 3 (persistencia segura).
2. **Base arquitectónica:** 2 (repositorios) → 4 (perfil sin duplicar) → 5 (defaults) → 1 (partir store).
3. **Separación de capas:** 6 → 11 → 10 → 12.
4. **Extensibilidad:** 7 → 8 → 9.
5. **Rendimiento y estructura de UI:** 13 → 15 → 14 → 16.
6. **Pulido:** 18 → 19 → 20 → 21.

> Hacer 2, 4 y 5 **antes** de 1 simplifica mucho la división del store: casi todo el código que se mueve ya estará desacoplado de Dexie y sin duplicación.

## Resultado esperado

| Aspecto | Antes | Después |
|---|---|---|
| Mayor archivo del store | ~596 líneas | < 200 líneas por store |
| Dependencia de Dexie | store + casos de uso | solo `infrastructure/` |
| Fuentes de verdad de límites | 2 (constantes + JSON) | 1 (configuración) |
| Código muerto | `AdapterRegistry` sin uso | ninguno |
| Dirección de dependencias | `domain → utils`, `utils → domain` | `application → domain`, `infrastructure → application` |
| Agregar una universidad | editar varios archivos existentes | agregar archivos + registrar |
