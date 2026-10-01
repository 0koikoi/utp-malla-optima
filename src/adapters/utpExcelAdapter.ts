import * as XLSX from 'xlsx';
import type { Curso, EstadoCurso, TipoCurso } from '@/core/types';
import type { CurriculumAdapter } from './CurriculumAdapter';

type ExcelCell = string | number | boolean | null | undefined;
type ExcelRow = ExcelCell[];

type ColumnasUTP = {
  codigo: number;
  nombre: number;
  horas: number;
  creditos: number;
  tipo: number;
  prerrequisitos: number;
  estado: number;
  ciclo: number | null;
};

const CICLO_MINIMO = 1;
const CICLO_MAXIMO = 14;

/**
 * Adaptador canónico para el "Plan de Estudio" exportado por UTP.
 *
 * El archivo Excel de UTP normalmente no posee una columna con el número de ciclo,
 * sino filas separadoras ("1er ciclo", "2do ciclo", ..., "10mo ciclo").
 * Detecta dinámicamente las columnas por encabezados y alias normalizados (NFD),
 * preservando la robustez frente a variaciones de formato.
 */

const texto = (valor: ExcelCell): string =>
  valor === null || valor === undefined ? '' : String(valor).trim();

const normalizarTexto = (valor: ExcelCell): string =>
  texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const romanToNumber = (roman: string): number | null => {
  const mapa: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
  };

  return mapa[roman.toUpperCase().trim()] ?? null;
};

const esCicloValido = (ciclo: number): boolean =>
  Number.isInteger(ciclo) && ciclo >= CICLO_MINIMO && ciclo <= CICLO_MAXIMO;

/** Reconoce los formatos de separación de ciclos usados por UTP */
const extraerCicloSeparador = (valor: ExcelCell): number | null => {
  const limpio = normalizarTexto(valor);
  if (!limpio) return null;

  const numeroAntes = limpio.match(
    /^(\d{1,2})(?:ER|DO|RO|TO|MO|VO|NO|AVO)?\s+CICLO$/
  );
  if (numeroAntes) {
    const ciclo = Number(numeroAntes[1]);
    return esCicloValido(ciclo) ? ciclo : null;
  }

  const numeroDespues = limpio.match(
    /^CICLO(?:\s+(?:N|NRO|NUMERO))?\s+(\d{1,2})$/
  );
  if (numeroDespues && numeroDespues[1] !== undefined) {
    const ciclo = Number(numeroDespues[1]);
    return esCicloValido(ciclo) ? ciclo : null;
  }

  const romanoDespues = limpio.match(/^CICLO\s+([IVX]+)$/);
  if (romanoDespues && romanoDespues[1] !== undefined) {
    const ciclo = romanToNumber(romanoDespues[1]);
    return ciclo !== null && esCicloValido(ciclo) ? ciclo : null;
  }

  const romanoAntes = limpio.match(/^([IVX]+)\s+CICLO$/);
  if (romanoAntes && romanoAntes[1] !== undefined) {
    const ciclo = romanToNumber(romanoAntes[1]);
    return ciclo !== null && esCicloValido(ciclo) ? ciclo : null;
  }

  return null;
};

const extraerCicloCelda = (valor: ExcelCell): number | null => {
  const limpio = normalizarTexto(valor);
  if (!limpio) return null;

  if (/^\d{1,2}$/.test(limpio)) {
    const ciclo = Number(limpio);
    return esCicloValido(ciclo) ? ciclo : null;
  }

  const romano = romanToNumber(limpio);
  if (romano !== null && esCicloValido(romano)) return romano;

  return extraerCicloSeparador(limpio);
};

const encontrarColumna = (encabezados: string[], alias: string[]): number =>
  encabezados.findIndex((encabezado) => alias.includes(encabezado));

const detectarColumnas = (fila: ExcelRow): ColumnasUTP | null => {
  const encabezados = fila.map(normalizarTexto);

  const codigo = encontrarColumna(encabezados, [
    'CODIGO CURSO',
    'CODIGO DE CURSO',
    'CODIGO',
  ]);
  const nombre = encontrarColumna(encabezados, [
    'NOMBRE CURSO',
    'NOMBRE DE CURSO',
    'NOMBRE DEL CURSO',
    'ASIGNATURA',
  ]);
  const horas = encontrarColumna(encabezados, [
    'HORAS SEMANALES',
    'HORAS',
    'HRS SEMANALES',
  ]);
  const creditos = encontrarColumna(encabezados, [
    'CREDITOS',
    'CREDITO',
  ]);
  const tipo = encontrarColumna(encabezados, ['TIPO']);
  const prerrequisitos = encontrarColumna(encabezados, [
    'PRE REQUISITO',
    'PRERREQUISITO',
    'PRE REQUISITOS',
    'PRERREQUISITOS',
  ]);
  const estado = encontrarColumna(encabezados, [
    'ESTADO',
    'CONDICION',
    'CONDICION ACADEMICA',
  ]);

  const cicloDetectado = encontrarColumna(encabezados, [
    'CICLO',
    'NUMERO CICLO',
    'NRO CICLO',
    'NIVEL',
    'SEMESTRE',
  ]);

  const requeridas = [codigo, nombre, horas, creditos, tipo, prerrequisitos, estado];
  if (requeridas.some((indice) => indice < 0)) return null;

  return {
    codigo,
    nombre,
    horas,
    creditos,
    tipo,
    prerrequisitos,
    estado,
    ciclo: cicloDetectado >= 0 ? cicloDetectado : null,
  };
};

const normalizarEstado = (valor: ExcelCell): EstadoCurso => {
  const estado = normalizarTexto(valor);

  if (estado.includes('CONVALID')) return 'CONVALIDADO';
  if (estado.includes('APROB')) return 'APROBADO';
  if (estado.includes('EN CURSO') || estado.includes('EN PROCESO') || estado.includes('MATRIC')) return 'EN_CURSO';
  return 'PENDIENTE';
};

const normalizarTipo = (valor: ExcelCell, nombreCurso = ''): TipoCurso => {
  const tipo = normalizarTexto(valor);
  const nombre = normalizarTexto(nombreCurso);

  // En el Excel de UTP, el tipo de curso se define por:
  // - 'O' u 'OBLIGATORIO' -> OBLIGATORIO
  // - 'E' u 'ELECTIVO'    -> ELECTIVO
  if (tipo === 'E' || tipo === 'ELECTIVO' || tipo.includes('ELECTIV') || nombre.includes('ELECTIV')) {
    return 'ELECTIVO';
  }
  return 'OBLIGATORIO';
};

const normalizarNumero = (valor: ExcelCell): number => {
  const numStr = texto(valor).replace(',', '.');
  const numero = Number.parseFloat(numStr);
  return Number.isFinite(numero) ? numero : 0;
};

const SIN_PRERREQUISITO = new Set([
  '',
  '0',
  '11',
  '-',
  'NINGUNO',
  'NINGUNA',
  'NO TIENE',
  'NO APLICA',
  'SIN REQUISITO',
  'SIN REQUISITOS',
  'SIN PRERREQUISITO',
  'SIN PRERREQUISITOS',
]);

const normalizarPrerrequisitos = (valor: ExcelCell): string[] => {
  const unicos = new Set<string>();

  texto(valor)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((requisito) => {
      if (!SIN_PRERREQUISITO.has(normalizarTexto(requisito))) {
        unicos.add(requisito);
      }
    });

  return [...unicos];
};

const esFilaNivelacion = (valor: ExcelCell): boolean =>
  normalizarTexto(valor).includes('CURSOS DE NIVELACION');

const contarCeldasConDatos = (fila: ExcelRow): number =>
  fila.filter((celda) => Boolean(texto(celda))).length;

/**
 * Parsea un archivo Excel de UTP devolviendo una lista de cursos con tipado canónico.
 */
export const parseUTPExcel = async (file: File): Promise<Curso[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const nombreHoja = workbook.SheetNames[0];

  if (!nombreHoja) {
    throw new Error('El archivo Excel no contiene hojas de datos.');
  }

  const hoja = workbook.Sheets[nombreHoja];
  if (!hoja) {
    throw new Error('No se pudo acceder al contenido de la hoja de cálculo.');
  }

  const filas = XLSX.utils.sheet_to_json<ExcelRow>(hoja, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (filas.length === 0) return [];

  let indiceEncabezado = -1;
  let columnas: ColumnasUTP | null = null;

  for (let indice = 0; indice < Math.min(filas.length, 25); indice += 1) {
    const fila = filas[indice];
    if (!fila) continue;
    const detectadas = detectarColumnas(fila);
    if (detectadas) {
      indiceEncabezado = indice;
      columnas = detectadas;
      break;
    }
  }

  if (indiceEncabezado < 0 || !columnas) {
    throw new Error(
      'Formato UTP no reconocido. No se encontraron las columnas Código Curso, Nombre Curso, Horas Semanales, Créditos, Tipo, Pre-Requisito y Estado.'
    );
  }

  const cursos: Curso[] = [];
  let cicloActual: number | null = null;
  let dentroDeNivelacion = false;

  for (let indice = indiceEncabezado + 1; indice < filas.length; indice += 1) {
    const fila = filas[indice] ?? [];
    if (contarCeldasConDatos(fila) === 0) continue;

    const codigoRaw = texto(fila[columnas.codigo]);
    const nombreRaw = texto(fila[columnas.nombre]);

    if (esFilaNivelacion(codigoRaw)) {
      dentroDeNivelacion = true;
      cicloActual = null;
      continue;
    }

    const cicloSeparador = extraerCicloSeparador(codigoRaw);
    if (cicloSeparador !== null && contarCeldasConDatos(fila) <= 2) {
      cicloActual = cicloSeparador;
      dentroDeNivelacion = false;
      continue;
    }

    if (dentroDeNivelacion) continue;
    if (!codigoRaw || !nombreRaw) continue;

    let cicloCurso = cicloActual;

    if (columnas.ciclo !== null) {
      const cicloDesdeCelda = extraerCicloCelda(fila[columnas.ciclo]);
      if (cicloDesdeCelda !== null) cicloCurso = cicloDesdeCelda;
    }

    if (cicloCurso === null) {
      throw new Error(
        `No se pudo determinar el ciclo del curso ${codigoRaw} - ${nombreRaw}.`
      );
    }

    const estado = normalizarEstado(fila[columnas.estado]);
    const prerequisitos = normalizarPrerrequisitos(fila[columnas.prerrequisitos]);

    // Retorna un objeto compatible con Curso canónico y adaptadores de transición
    const cursoItem: Curso & Record<string, any> = {
      codigo: codigoRaw,
      nombre: nombreRaw,
      horasSemanales: normalizarNumero(fila[columnas.horas]) || 3,
      creditos: normalizarNumero(fila[columnas.creditos]) || 0,
      tipo: normalizarTipo(fila[columnas.tipo], nombreRaw),
      estado,
      prerequisitos,
      prerrequisitos: prerequisitos,
      habilitaA: [],
      cicloOrigen: cicloCurso,
      esLaboratorio: /LABORATORIO|TALLER|CURSO INTEGRADOR/i.test(nombreRaw),
      // Campos opcionales para compatibilidad con código transicional
      ciclo: cicloCurso,
      tipoPeriodo: 'REGULAR',
      ubicacion: ['APROBADO', 'CONVALIDADO', 'EN_CURSO'].includes(estado) ? 'periodo' : 'banco',
    };

    cursos.push(cursoItem);
  }

  // Segunda pasada: construir relaciones inversas (habilitaA)
  for (const curso of cursos) {
    for (const codigoPre of curso.prerequisitos) {
      const cursoRequerido = cursos.find((c) => c.codigo === codigoPre);
      if (cursoRequerido && !cursoRequerido.habilitaA.includes(curso.nombre)) {
        cursoRequerido.habilitaA.push(curso.nombre);
      }
    }
  }

  return cursos;
};

/**
 * Parsea un archivo Excel de UTP y devuelve un diccionario indexado por código de curso,
 * ideal para despachar directamente al `plannerStore`.
 */
export const parseUTPExcelToMap = async (file: File): Promise<Record<string, Curso>> => {
  const cursos = await parseUTPExcel(file);
  const map: Record<string, Curso> = {};
  for (const curso of cursos) {
    map[curso.codigo] = curso;
  }
  return map;
};

export class UTPExcelAdapter implements CurriculumAdapter {
  readonly universidadId = 'pe-utp';

  async parse(file: File): Promise<Curso[]> {
    return parseUTPExcel(file);
  }
}
