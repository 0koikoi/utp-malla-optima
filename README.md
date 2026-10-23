# React + TypeScript + Vite

## Asistente académico IA

Botón flotante (abajo a la derecha) que analiza el plan y responde preguntas sobre carga, costos,
jalados, ruta y electivos. Arquitectura:

```
GitHub Pages (este frontend) ──▶ proxy en Vercel (ai-proxy/) ──▶ API de DeepSeek
```

- `src/application/ai/buildAIContext.ts` calcula TODO lo numérico y lógico (créditos, 4 escenarios de
  pago, nivel de carga, what-if, ruta, ventana de jalados). La IA solo redacta. No se envía el nombre
  del archivo ni datos personales.
- `src/application/ai/contracts.ts` (Zod) define petición y respuestas; los códigos de curso que no
  existan en el contexto se descartan. `ai-proxy/src/contracts.ts` es una copia verificada por test.
- La API key y el prompt del sistema viven solo en `ai-proxy/` (ver `ai-proxy/README.md`).
- `VITE_AI_ENDPOINT`: URL del proxy. Vacía en `pnpm dev` → mock local sin red. En el deploy se toma de
  la variable de Actions `vars.VITE_AI_ENDPOINT` (Settings → Secrets and variables → Actions → Variables).
- Sin clave de DeepSeek el proxy responde en modo mock con los datos reales del contexto.

## Demo en Vercel

La demo usa **dos proyectos de Vercel** creados desde este mismo repo:

| Proyecto | Root Directory | Framework | Build | Output |
| --- | --- | --- | --- | --- |
| Proxy del asistente | `ai-proxy` | Other (función `api/asistente.ts`) | (ninguno) | (ninguno) |
| Web (demo) | raíz del repo (`./`) | Vite | `pnpm build` | `dist` |

Variables de la **web** (Settings → Environment Variables):

- `VITE_BASE=/`: la demo se sirve en la raíz del dominio. Sin esta variable el build usa
  `/utp-malla-optima/`, la base de GitHub Pages (que no cambia).
- `VITE_AI_ENDPOINT=https://<proyecto-proxy>.vercel.app/api/asistente`: URL pública del proxy.

Las variables `VITE_*` se leen **al compilar**: después de cambiarlas hay que volver a desplegar.

Variables del **proxy**: ver `ai-proxy/README.md`. El dominio de la demo
(`https://<proyecto-web>.vercel.app`) debe agregarse a `ALLOWED_ORIGINS` del proxy, junto al de
GitHub Pages, separados por coma; si no, el navegador bloquea las llamadas por CORS.

Comprobación local de las dos bases: `pnpm verify:base` compila con y sin `VITE_BASE=/` y revisa
`index.html`, el manifest de la PWA (`start_url`, `scope`) y el service worker. En Windows con Git
Bash, `VITE_BASE=/ pnpm build` no sirve para probar a mano: MSYS convierte `/` en una ruta de Windows;
usa PowerShell (`$env:VITE_BASE='/'; pnpm build`) o `pnpm verify:base`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
