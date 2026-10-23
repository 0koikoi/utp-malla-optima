import type { Curso } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import { z } from 'zod';
import { migrateLegacyFinancialRulesReference } from '../../financial/rules/financialRulesCompatibility';
import { CURRENT_ACADEMIC_BACKUP_VERSION } from './academicBackupVersion';
import { validateCourses } from '../../domain/schemas/courseSchema';
import { MAXIMO_CICLOS } from '../../domain/rules/cycleRules';

export interface ImportedBackup {
  cursos: Curso[];
  tarifario: Tarifario | null;
}

const BackupEnvelopeSchema = z.object({
  version: z.unknown().optional(),
  cursos: z.unknown().optional(),
  tarifario: z.unknown().optional(),
  asignaciones: z.unknown().optional(),
  periodoIngreso: z.unknown().optional(),
  veranoUbicaciones: z.unknown().optional(),
});

const numeroNoNegativo = z.number().finite().nonnegative();
const textoNoVacio = z.string().trim().min(1);

const BackupCourseSchema = z.object({
  codigo: textoNoVacio,
  nombre: textoNoVacio,
  ciclo: z.number().int().min(1).max(MAXIMO_CICLOS),
  cicloOrigen: z.number().int().min(1).max(MAXIMO_CICLOS).optional(),
  tipoPeriodo: z.enum(['REGULAR', 'VERANO']).default('REGULAR'),
  ubicacion: z.enum(['banco', 'periodo', 'ciclo']).optional(),
  horasSemanales: numeroNoNegativo,
  creditos: numeroNoNegativo,
  tipo: z.enum(['OBLIGATORIO', 'ELECTIVO']),
  estado: z.enum(['APROBADO', 'CONVALIDADO', 'EN_CURSO', 'PENDIENTE']).default('PENDIENTE'),
  prerrequisitos: z.array(z.string()).default([]),
  disciplina: z.string().optional(),
  esLaboratorio: z.boolean().optional(),
  jalado: z.boolean().optional(),
});

const TarifasDetalleSchema = z.object({
  costoMatriculaRegular: numeroNoNegativo,
  costoPorCredito: numeroNoNegativo,
  costoPorHora: numeroNoNegativo,
  costoPorCurso: numeroNoNegativo,
  costoFijoLaboratorio: numeroNoNegativo,
  recargoRepitenciaPorcentaje: numeroNoNegativo,
  rangosPension: z.array(z.object({
    minHoras: numeroNoNegativo,
    maxHoras: numeroNoNegativo,
    montoCuota: numeroNoNegativo,
  })).optional(),
  costoHoraAdicional: numeroNoNegativo.optional(),
});

const TarifarioSchema = z.object({
  universidadId: textoNoVacio,
  reglasFinancierasId: textoNoVacio.optional(),
  tarifarioVersion: textoNoVacio.optional(),
  sedeId: textoNoVacio.optional(),
  moneda: textoNoVacio,
  modalidadPrincipal: z.enum(['POR_CREDITO', 'POR_HORA', 'POR_CURSO', 'ESCALA_FIJA']),
  cuotasPorCiclo: z.number().int().positive(),
  semanasPorCiclo: z.number().positive(),
  disciplinas: z.record(textoNoVacio, TarifasDetalleSchema).refine(
    (disciplinas) => Object.keys(disciplinas).length > 0
  ),
  sede: z.string().optional(),
  modalidadEstudio: z.string().optional(),
  vigencia: z.string().optional(),
  metodosPago: z.record(textoNoVacio, z.object({
    nombre: textoNoVacio,
    descuentoPorcentaje: numeroNoNegativo.max(100),
    requiereProntoPago: z.boolean().optional(),
  })).optional(),
  cuotasPorVerano: z.number().int().positive().optional(),
  costoMatriculaVerano: numeroNoNegativo.optional(),
  descuentoPagoUnicoRegular: numeroNoNegativo.max(100).optional(),
  costoProgramaSaludEstudiantil: numeroNoNegativo.optional(),
  limitesAcademicos: z.object({
    creditosMinimos: numeroNoNegativo,
    creditosMaximos: numeroNoNegativo,
    horasRecomendadasPeriodo: numeroNoNegativo.optional(),
    horasMaximasPlanificacion: numeroNoNegativo.optional(),
    creditosMaximosVerano: numeroNoNegativo.optional(),
    creditosMinimosElectivos: numeroNoNegativo.optional(),
  }).optional(),
  multiplicadorHorasVerano: numeroNoNegativo.optional(),
  multiplicadorCostoVerano: numeroNoNegativo.optional(),
});

const validarCursosRespaldo = (value: unknown): Curso[] => {
  const parsed = z.array(BackupCourseSchema).safeParse(value);
  if (!parsed.success) throw new Error('Los cursos del respaldo son inválidos.');

  return validateCourses(parsed.data.map((curso) => ({
    ...curso,
    cicloOrigen: curso.cicloOrigen ?? curso.ciclo,
    ubicacion: curso.ubicacion === 'ciclo' ? 'periodo' : curso.ubicacion ??
      (curso.estado === 'PENDIENTE' ? 'banco' : 'periodo'),
  })));
};

const convertirRespaldoVisual = (data: z.infer<typeof BackupEnvelopeSchema>): Curso[] => {
  if (!data.cursos || typeof data.cursos !== 'object' || Array.isArray(data.cursos) ||
      !data.asignaciones || typeof data.asignaciones !== 'object' || Array.isArray(data.asignaciones)) {
    throw new Error('Archivo de respaldo inválido');
  }
  const asignaciones = data.asignaciones as Record<string, unknown>;
  const veranos = data.veranoUbicaciones && typeof data.veranoUbicaciones === 'object'
    ? data.veranoUbicaciones as Record<string, unknown> : {};
  const ingreso = data.periodoIngreso === 'agosto' ? 'agosto' : 'marzo';
  const cursos = Object.entries(data.cursos as Record<string, unknown>).map(([codigo, valor]) => {
    if (!valor || typeof valor !== 'object') throw new Error(`Curso inválido: ${codigo}`);
    const curso = valor as Record<string, unknown>;
    const ubicacion = String(asignaciones[codigo] ?? 'pozo');
    const verano = /^verano-(\d+)$/.exec(ubicacion);
    const regular = /^ciclo-(\d+)$/.exec(ubicacion);
    if (ubicacion !== 'pozo' && !verano && !regular) throw new Error(`Periodo inválido: ${ubicacion}`);
    const numeroVerano = verano ? Number(verano[1]) : 0;
    const cicloVerano = numeroVerano
      ? Number(veranos[String(numeroVerano)] ?? (ingreso === 'agosto' ? numeroVerano * 2 - 1 : numeroVerano * 2))
      : 0;
    const ciclo = verano ? cicloVerano : regular ? Number(regular[1]) : Number(curso.cicloOrigen ?? 1);
    if (!Number.isInteger(ciclo) || ciclo < 1 || ciclo > MAXIMO_CICLOS) throw new Error(`Ciclo inválido: ${codigo}`);
    const estado = String(curso.estado ?? 'PENDIENTE');
    if (!['APROBADO', 'CONVALIDADO', 'EN_CURSO', 'PENDIENTE'].includes(estado)) throw new Error(`Estado inválido: ${codigo}`);
    return {
      codigo: String(curso.codigo ?? codigo),
      nombre: String(curso.nombre ?? ''),
      cicloOrigen: Number(curso.cicloOrigen ?? ciclo),
      ciclo,
      tipoPeriodo: verano ? 'VERANO' as const : 'REGULAR' as const,
      ubicacion: ubicacion === 'pozo' ? 'banco' as const : 'periodo' as const,
      horasSemanales: Number(curso.horasSemanales ?? 0),
      creditos: Number(curso.creditos ?? 0),
      tipo: curso.tipo === 'ELECTIVO' ? 'ELECTIVO' as const : 'OBLIGATORIO' as const,
      estado: estado as Curso['estado'],
      prerrequisitos: Array.isArray(curso.prerrequisitos) ? curso.prerrequisitos.map(String)
        : Array.isArray(curso.prerequisitos) ? curso.prerequisitos.map(String) : [],
      disciplina: typeof curso.disciplina === 'string' ? curso.disciplina : undefined,
      esLaboratorio: Boolean(curso.esLaboratorio),
    };
  });
  return validarCursosRespaldo(cursos);
};

const parseBackupVersion = (value: unknown): number => {
  // Los primeros respaldos no incluían necesariamente una versión explícita.
  if (value === undefined || value === null) return 1;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error('Versión de respaldo inválida');
  }
  if (value > CURRENT_ACADEMIC_BACKUP_VERSION) {
    throw new Error(
      `El respaldo usa la versión ${value}, pero esta aplicación solo admite hasta la versión ${CURRENT_ACADEMIC_BACKUP_VERSION}.`
    );
  }
  return value;
};

export const parseAcademicBackup = (text: string): ImportedBackup => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El archivo no contiene un JSON válido.');
  }
  const envelope = BackupEnvelopeSchema.safeParse(json);
  if (!envelope.success) throw new Error('Archivo de respaldo inválido.');
  const data = envelope.data;

  if (!Array.isArray(data.cursos) && typeof data.version === 'string' &&
      (data.version === '1.0' || data.version === '2.0')) {
    return { cursos: convertirRespaldoVisual(data), tarifario: null };
  }
  parseBackupVersion(data.version);

  if (!Array.isArray(data.cursos)) {
    throw new Error('Archivo de respaldo inválido');
  }

  let tarifario: Tarifario | null = null;
  if (data.tarifario !== undefined && data.tarifario !== null) {
    const parsed = TarifarioSchema.safeParse(data.tarifario);
    if (!parsed.success) throw new Error('El tarifario del respaldo es inválido.');
    tarifario = migrateLegacyFinancialRulesReference(parsed.data);
  }

  return {
    cursos: validarCursosRespaldo(data.cursos),
    tarifario,
  };
};

export const importAcademicBackup = async (
  file: File
): Promise<ImportedBackup> => parseAcademicBackup(await file.text());
