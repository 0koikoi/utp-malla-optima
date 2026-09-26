# Pruebas de configuración financiera UTP

Las pruebas agregadas en `tests/` usan Vitest y están fuera de `src`, por lo que no afectan el build normal de Vite/TypeScript.

Agregar como dependencia de desarrollo:

```bash
pnpm add -D vitest
```

Agregar al bloque `scripts` de `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Ejecutar:

```bash
pnpm test
```

Cobertura incluida en esta fase:

- UTP Ate / tarifario 2026 regular.
- UTP Ate / tarifario 2026 verano.
- Selección exacta por sede y año (sin fallback silencioso a otra sede/año).
- Validación Zod de `sedeId`, `tarifarioVersion` y `vigencia`.
- Migración de referencias `utp-2026` a `utp`.
- Migración de backups v1/v2 al formato financiero actual.
- Rechazo de backups de una versión futura no soportada.
