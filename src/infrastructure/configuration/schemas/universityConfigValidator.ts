import { z } from 'zod';
import type { UniversityConfig } from '../../../types/university';
import { parseConfigWithSchema } from './zodConfigError';

const nonEmptyString = z.string().trim().min(1, 'se esperaba un texto no vacío');
const tarifarioVersion = z
  .string()
  .trim()
  .regex(/^20\d{2}$/, 'debe usar un año de cuatro dígitos, por ejemplo 2026');
const sedeId = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'debe usar minúsculas, números y guiones, por ejemplo ate o lima-centro'
  );

export const UniversityConfigSchema: z.ZodType<UniversityConfig> = z
  .object({
    universidadId: nonEmptyString.regex(
      /^pe-utp(?:-[a-z0-9]+)*$/,
      'debe ser un identificador UTP válido'
    ),
    reglasFinancierasId: z.literal('utp'),
    tarifarioVersion,
    sedeId,
    moneda: z.literal('PEN'),
    sede: nonEmptyString.optional(),
    modalidadEstudio: nonEmptyString.optional(),
    vigencia: nonEmptyString.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (config.vigencia && !config.vigencia.includes(config.tarifarioVersion)) {
      ctx.addIssue({
        code: 'custom',
        path: ['vigencia'],
        message: `debe corresponder a la versión tarifaria ${config.tarifarioVersion}`,
      });
    }
  });

export function validateUniversityConfig(value: unknown): UniversityConfig {
  return parseConfigWithSchema(UniversityConfigSchema, value, 'university.json');
}
