import { z } from 'zod';
import type { FinancialConfig } from '../../../types/financialConfig';
import { parseConfigWithSchema } from './zodConfigError';

const nonNegativeNumber = z.number().finite().nonnegative('el valor no puede ser negativo');
const positiveNumber = z.number().finite().positive('el valor debe ser mayor que 0');
const percentage = nonNegativeNumber.max(100, 'el porcentaje no puede superar 100');
const nonEmptyString = z.string().trim().min(1, 'se esperaba un texto no vacío');

const ModalidadCalculoSchema = z.enum([
  'POR_CREDITO',
  'POR_HORA',
  'POR_CURSO',
  'ESCALA_FIJA',
]);

const RangoTarifarioSchema = z
  .object({
    minHoras: positiveNumber,
    maxHoras: positiveNumber,
    montoCuota: nonNegativeNumber,
  })
  .strict()
  .refine(
    (range: { minHoras: number; maxHoras: number }) => range.minHoras <= range.maxHoras,
    {
      message: 'minHoras no puede superar maxHoras',
      path: ['minHoras'],
    }
  );

const TarifasDetalleSchema = z
  .object({
    costoMatriculaRegular: nonNegativeNumber,
    costoPorCredito: nonNegativeNumber,
    costoPorHora: nonNegativeNumber,
    costoPorCurso: nonNegativeNumber,
    costoFijoLaboratorio: nonNegativeNumber,
    recargoRepitenciaPorcentaje: nonNegativeNumber,
    rangosPension: z.array(RangoTarifarioSchema).optional(),
    costoHoraAdicional: nonNegativeNumber.optional(),
  })
  .strict();

const MetodoPagoTarifarioSchema = z
  .object({
    nombre: nonEmptyString,
    descuentoPorcentaje: percentage,
    requiereProntoPago: z.boolean().optional(),
  })
  .strict();

const DisciplinasSchema = z
  .record(nonEmptyString, TarifasDetalleSchema)
  .refine((value: Record<string, unknown>) => Object.keys(value).length > 0, {
    message: 'debe existir al menos una disciplina',
  });

const MetodosPagoSchema = z.record(nonEmptyString, MetodoPagoTarifarioSchema);

export const FinancialConfigSchema: z.ZodType<FinancialConfig> = z
  .object({
    modalidadPrincipal: ModalidadCalculoSchema,
    cuotasPorCiclo: positiveNumber,
    cuotasPorVerano: positiveNumber.optional(),
    semanasPorCiclo: positiveNumber,
    costoMatriculaVerano: nonNegativeNumber.optional(),
    costoProgramaSaludEstudiantil: nonNegativeNumber.optional(),
    metodosPago: MetodosPagoSchema.optional(),
    disciplinas: DisciplinasSchema,
    descuentoPagoUnicoRegular: percentage.optional(),
  })
  .strict();

export function validateFinancialConfig(
  value: unknown,
  source = 'financial.json'
): FinancialConfig {
  return parseConfigWithSchema(FinancialConfigSchema, value, source);
}
