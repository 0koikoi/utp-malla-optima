import { z } from 'zod';

const formatPath = (root: string, path: PropertyKey[]): string => {
  if (path.length === 0) return root;

  return path.reduce<string>((accumulator, segment) => {
    if (typeof segment === 'number') return `${accumulator}[${segment}]`;
    return `${accumulator}.${String(segment)}`;
  }, root);
};

/**
 * Convierte los errores estructurados de Zod en un error legible para los
 * loaders de configuración. Se mantiene Error como contrato público para no
 * acoplar al resto de la aplicación con Zod.
 */
export const parseConfigWithSchema = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  root: string
): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const detail = result.error.issues
    .map((issue: { path: PropertyKey[]; message: string }) =>
      `${formatPath(root, issue.path)}: ${issue.message}`
    )
    .join('; ');

  throw new Error(`Configuración inválida en ${root}: ${detail}`);
};
