/**
 * Evaluación manual contra la API real de DeepSeek (no corre en CI).
 * Uso: pnpm evaluar [--repeticiones N] [--solo <id>] [--simulado]
 * Lee DEEPSEEK_API_KEY de ai-proxy/.env.local; EVAL_MAX_USD (por defecto 1.00) corta el gasto.
 */
import { ejecutarCli, entornoReal } from './evaluacion/cli.js';

process.exitCode = await ejecutarCli(entornoReal());
