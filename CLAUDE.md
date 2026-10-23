# CLAUDE.md

## Documentación y flujo de trabajo

- Antes de trabajar, lee `docs/estado.md` y `docs/decisiones.md`.
- No cambies una decisión vigente sin registrar una nueva en `docs/decisiones.md` (y marcar la anterior como
  reemplazada).
- Al terminar, agrega una entrada en `docs/bitacora.md` y actualiza `docs/estado.md` y `docs/fallos.md`.
  Si algo no se puede confirmar en el código o en git, márcalo **(por verificar)**.
- Commits sin coautoría de Claude.
- No hagas push sin que te lo pidan.

## Comandos

- pnpm vía corepack: `corepack pnpm <comando>`.
- `pnpm test`: Vitest; corre también `ai-proxy/tests`.
- `pnpm lint`, `pnpm build`.
- `pnpm verify:base`: los builds con la base por defecto (`/`) y con una subruta (`VITE_BASE`), y el service worker.
- Evaluación con la API real (manual, gasta saldo): `cd ai-proxy && pnpm evaluar` (`--simulado` no gasta).
- Proxy: `cd ai-proxy && pnpm test && pnpm typecheck`.

## Reglas del código

- Todo lo numérico y lógico se calcula en el dominio; el asistente IA solo explica (`docs/decisiones.md`,
  D-001).
- `src/application/ai/contracts.ts` y `src/application/ai/mockRespuestas.ts` tienen copias idénticas en
  `ai-proxy/src/`: edita el original y vuelve a copiarlo (un test falla si difieren).
- La API key y el prompt del sistema viven solo en `ai-proxy/`.
