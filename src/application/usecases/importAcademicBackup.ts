import type { Curso } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import { migrateLegacyFinancialRulesReference } from '../../financial/rules/financialRulesCompatibility';
import { CURRENT_ACADEMIC_BACKUP_VERSION } from './academicBackupVersion';
import { validateCourses } from '../../domain/schemas/courseSchema';

export interface ImportedBackup {
  cursos: Curso[];
  tarifario: Tarifario | null;
}

interface RawAcademicBackup {
  version?: unknown;
  cursos?: unknown;
  tarifario?: unknown;
  asignaciones?: unknown;
  periodoIngreso?: unknown;
  veranoUbicaciones?: unknown;
}

const convertirRespaldoVisual = (data: RawAcademicBackup): Curso[] => {
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
    if (!Number.isInteger(ciclo) || ciclo < 1 || ciclo > 12) throw new Error(`Ciclo inválido: ${codigo}`);
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
  return validateCourses(cursos);
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
  const data = JSON.parse(text) as RawAcademicBackup;

  if (!Array.isArray(data.cursos) && typeof data.version === 'string' &&
      (data.version === '1.0' || data.version === '2.0')) {
    return { cursos: convertirRespaldoVisual(data), tarifario: null };
  }
  parseBackupVersion(data.version);

  if (!Array.isArray(data.cursos)) {
    throw new Error('Archivo de respaldo inválido');
  }

  if (
    data.tarifario !== undefined &&
    data.tarifario !== null &&
    (typeof data.tarifario !== 'object' || Array.isArray(data.tarifario))
  ) {
    throw new Error('El tarifario del respaldo es inválido');
  }

  const tarifario = data.tarifario
    ? migrateLegacyFinancialRulesReference(data.tarifario as Tarifario)
    : null;

  return {
    cursos: validateCourses(data.cursos as Curso[]),
    tarifario,
  };
};

export const importAcademicBackup = async (
  file: File
): Promise<ImportedBackup> => parseAcademicBackup(await file.text());
