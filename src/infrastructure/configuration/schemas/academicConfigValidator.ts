import { z } from 'zod';
import type { AcademicConfig } from '../../../types/academicConfig';
import { parseConfigWithSchema } from './zodConfigError';

const positiveNumber = z.number().finite().positive('el valor debe ser mayor que 0');

const AcademicLimitsSchema = z
  .object({
    creditosMinimos: positiveNumber,
    creditosMaximos: positiveNumber,
  })
  .strict()
  .refine(
    (limits: { creditosMinimos: number; creditosMaximos: number }) =>
      limits.creditosMinimos <= limits.creditosMaximos,
    {
      message: 'el mínimo no puede superar al máximo',
      path: ['creditosMinimos'],
    }
  );

const SummerAcademicConfigSchema = z
  .object({
    multiplicadorHorasTarifarias: positiveNumber,
  })
  .strict();

export const AcademicConfigSchema: z.ZodType<AcademicConfig> = z
  .object({
    limitesAcademicos: AcademicLimitsSchema.optional(),
    verano: SummerAcademicConfigSchema.optional(),
  })
  .strict();

export function validateAcademicConfig(value: unknown): AcademicConfig {
  return parseConfigWithSchema(AcademicConfigSchema, value, 'academic.json');
}
