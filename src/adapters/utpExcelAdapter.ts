import * as XLSX from 'xlsx';
import type { Curso, EstadoCurso, TipoCurso } from '../types/academic';
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
const CICLO_MAXIMO = 10;

/**
 * Este adaptador está pensado para el "Plan de Estudio" exportado por UTP.
 *
 * El Excel NO trae una columna de ciclo. El ciclo se obtiene de las filas
 * separadoras: "1er ciclo", "2do ciclo", ..., "10mo ciclo".
 *
 * Importante: no se debe buscar una columna usando `includes('SEM')`, porque
 * "Horas Semanales(*)" contiene "SEM" y eso provoca que las horas (2, 3, 4...)
 * sean interpretadas erróneamente como números de ciclo.
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
  };

  return mapa[roman.toUpperCase().trim()] ?? null;
};

const esCicloValido = (ciclo: number): boolean =>
  Number.isInteger(ciclo) && ciclo >= CICLO_MINIMO && ciclo <= CICLO_MAXIMO;

/** Reconoce los formatos usados por UTP: 1er ciclo, 2do ciclo, 10mo ciclo. */
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
  if (numeroDespues) {
    const ciclo = Number(numeroDespues[1]);
    return esCicloValido(ciclo) ? ciclo : null;
  }

  const romanoDespues = limpio.match(/^CICLO\s+([IVX]+)$/);
  if (romanoDespues) {
    const ciclo = romanToNumber(romanoDespues[1]);
    return ciclo !== null && esCicloValido(ciclo) ? ciclo : null;
  }

  const romanoAntes = limpio.match(/^([IVX]+)\s+CICLO$/);
  if (romanoAntes) {
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

  // Solo nombres completos. Nunca hacer match con "SEM" porque colisiona con
  // "HORAS SEMANALES".
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
  if (estado.includes('EN CURSO') || estado.includes('MATRIC')) return 'EN_CURSO';
  return 'PENDIENTE';
};

const normalizarTipo = (valor: ExcelCell): TipoCurso => {
  const tipo = normalizarTexto(valor);
  return tipo === 'E' || tipo.includes('ELECTIV') ? 'ELECTIVO' : 'OBLIGATORIO';
};

const normalizarNumero = (valor: ExcelCell): number => {
  const numero = Number.parseFloat(texto(valor).replace(',', '.'));
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
  fila.reduce((total: number, celda) => total + (texto(celda) ? 1 : 0), 0);

export const parseUTPExcel = async (file: File): Promise<Curso[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const nombreHoja = workbook.SheetNames[0];

  if (!nombreHoja) {
    throw new Error('El archivo Excel no contiene hojas.');
  }

  const hoja = workbook.Sheets[nombreHoja];
  const filas = XLSX.utils.sheet_to_json<ExcelRow>(hoja, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (filas.length === 0) return [];

  let indiceEncabezado = -1;
  let columnas: ColumnasUTP | null = null;

  // El export de UTP normalmente tiene los encabezados al inicio, pero se deja
  // margen por si en otra versión aparecen algunas filas informativas encima.
  for (let indice = 0; indice < Math.min(filas.length, 20); indice += 1) {
    const detectadas = detectarColumnas(filas[indice]);
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

    // "Cursos de nivelación" es una sección diferente a los ciclos 1-10.
    if (esFilaNivelacion(codigoRaw)) {
      dentroDeNivelacion = true;
      cicloActual = null;
      continue;
    }

    // Los separadores reales del Excel están en la columna "Código Curso":
    // "1er ciclo", "2do ciclo", ... "10mo ciclo".
    const cicloSeparador = extraerCicloSeparador(codigoRaw);
    if (cicloSeparador !== null && contarCeldasConDatos(fila) <= 2) {
      cicloActual = cicloSeparador;
      dentroDeNivelacion = false;
      continue;
    }

    // La UI actual de Academic Planner tiene filas regulares del ciclo 1 al 10,
    // pero todavía no posee la caja independiente de Nivelación. Para evitar
    // ubicar esas materias incorrectamente en el ciclo 1, no se mezclan aquí.
    if (dentroDeNivelacion) continue;

    // Una fila de curso real debe tener al menos código y nombre.
    if (!codigoRaw || !nombreRaw) continue;

    let cicloCurso = cicloActual;

    // Compatibilidad con eventuales variantes del archivo que sí incluyan una
    // columna "Ciclo" explícita. Solo se usa si el encabezado fue detectado por
    // nombre exacto/alias seguro.
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

    cursos.push({
      codigo: codigoRaw,
      nombre: nombreRaw,
      ciclo: cicloCurso,
      cicloOrigen: cicloCurso,
      ubicacion:
        estado === 'APROBADO' || estado === 'CONVALIDADO' || estado === 'EN_CURSO'
          ? 'ciclo'
          : 'banco',
      horasSemanales: normalizarNumero(fila[columnas.horas]),
      creditos: normalizarNumero(fila[columnas.creditos]),
      tipo: normalizarTipo(fila[columnas.tipo]),
      prerrequisitos: normalizarPrerrequisitos(fila[columnas.prerrequisitos]),
      esLaboratorio: /LABORATORIO|TALLER|CURSO INTEGRADOR/i.test(nombreRaw),
      estado,
    });
  }

  return cursos;
};


export class UTPExcelAdapter implements CurriculumAdapter {
  readonly universidadId = 'pe-utp';

  async parse(file: File): Promise<Curso[]> {
    return parseUTPExcel(file);
  }
}
