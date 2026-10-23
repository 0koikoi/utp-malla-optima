import { crearHandlers, leerConfig } from '../src/handler.js';

// Función de Vercel con handlers web estándar. La configuración se lee en cada
// invocación para que un `vercel env` nuevo aplique sin cambiar el código.
const handlers = () => crearHandlers(leerConfig(process.env));

export async function POST(request: Request): Promise<Response> {
  return handlers().POST(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handlers().OPTIONS(request);
}
