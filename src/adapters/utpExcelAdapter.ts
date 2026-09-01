import * as XLSX from 'xlsx';
import type { Curso, EstadoCurso, TipoCurso } from '../types/academic';

const romanToNumber = (roman: string): number | null => {
  const map: Record<string, number> = {
    I: 1, II: 2, III: 3, IV: 4, V: 5,
    VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
    XI: 11, XII: 12
  };
  return map[roman.toUpperCase().trim()] || null;
};

const extractCicloFromText = (text: string): number | null => {
  const clean = text.toUpperCase().trim();
  // Detecta "CICLO 01", "CICLO 2", "CICLO VI", "NIVEL 3", "SEMESTRE 4"
  const regex = /(?:CICLO|NIVEL|SEMESTRE)\s*(?:N[°ºO]?\s*|\:\s*)?([0-9]{1,2}|[IVXLCDM]+)\b/i;
  const match = clean.match(regex);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return !isNaN(num) ? num : romanToNumber(match[1]);
  }
  return null;
};

export const parseUTPExcel = async (file: File): Promise<Curso[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '' });

  if (rawRows.length === 0) return [];

  // 1. Identificar fila de encabezados
  let headerIndex = -1;
  let colIndices = { codigo: -1, nombre: -1, ciclo: -1, horas: -1, creditos: -1, tipo: -1, reqs: -1, estado: -1 };

  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i].map((c: any) => String(c).toUpperCase().trim());
    const hasNombre = row.some((c: string) => c.includes('NOMBRE') || c.includes('ASIGNATURA') || c.includes('CURSO'));
    const hasDatos = row.some((c: string) => c.includes('CRED') || c.includes('HORA') || c.includes('ESTADO'));

    if (hasNombre && hasDatos) {
      headerIndex = i;
      colIndices.codigo = row.findIndex((c: string) => c.includes('COD') || c.includes('CÓD'));
      colIndices.nombre = row.findIndex((c: string) => c.includes('NOMBRE') || c.includes('ASIGNATURA'));
      colIndices.ciclo = row.findIndex((c: string) => c.includes('CICLO') || c.includes('NIVEL') || c.includes('SEM'));
      colIndices.horas = row.findIndex((c: string) => c.includes('HORA') || c.includes('HRS'));
      colIndices.creditos = row.findIndex((c: string) => c.includes('CRED') || c.includes('CRÉD'));
      colIndices.tipo = row.findIndex((c: string) => c.includes('TIPO') || c.includes('MODALIDAD'));
      colIndices.reqs = row.findIndex((c: string) => c.includes('REQ') || c.includes('PRERREQUISITO'));
      colIndices.estado = row.findIndex((c: string) => c.includes('ESTADO') || c.includes('CONDIC'));
      break;
    }
  }

  const cursos: Curso[] = [];
  let currentCicloTracker = 1;
  const startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;

  for (let i = startIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rowStrings = row.map((cell: any) => String(cell).trim());
    const fullRowText = rowStrings.join(' ').toUpperCase();
    if (!fullRowText) continue;

    // Detectar si la fila es un separador de ciclo (ej. "CICLO 02", "CICLO 3")
    const cicloSeparator = extractCicloFromText(fullRowText);
    const hasDataCells = rowStrings.filter((s: string) => s.length > 0).length > 2;

    if (cicloSeparator !== null && !hasDataCells) {
      currentCicloTracker = cicloSeparator;
      continue;
    }

    // Extraer campos según índices detectados o fallback posicional
    const rawCodigo = colIndices.codigo !== -1 ? rowStrings[colIndices.codigo] : rowStrings[0] || '';
    const rawNombre = colIndices.nombre !== -1 ? rowStrings[colIndices.nombre] : rowStrings[1] || '';
    const rawCiclo = colIndices.ciclo !== -1 ? rowStrings[colIndices.ciclo] : '';
    const rawHoras = colIndices.horas !== -1 ? rowStrings[colIndices.horas] : rowStrings[2] || '0';
    const rawCreditos = colIndices.creditos !== -1 ? rowStrings[colIndices.creditos] : rowStrings[3] || '0';
    const rawTipo = colIndices.tipo !== -1 ? rowStrings[colIndices.tipo] : rowStrings[4] || '';
    const rawReqs = colIndices.reqs !== -1 ? rowStrings[colIndices.reqs] : rowStrings[5] || '';
    const rawEstado = colIndices.estado !== -1 ? rowStrings[colIndices.estado] : rowStrings[6] || '';

    // Descartar encabezados repetidos o filas de totales
    if (!rawNombre || rawNombre.toUpperCase().includes('NOMBRE DEL CURSO') || rawNombre.toUpperCase().includes('TOTAL')) {
      continue;
    }

    // Determinar ciclo específico del curso
    let cicloCurso = currentCicloTracker;
    if (rawCiclo) {
      const parsedColCiclo = parseInt(rawCiclo, 10) || romanToNumber(rawCiclo);
      if (parsedColCiclo && parsedColCiclo >= 1 && parsedColCiclo <= 14) {
        cicloCurso = parsedColCiclo;
        currentCicloTracker = parsedColCiclo;
      }
    }

    // Normalizar Estado Académico
    let estado: EstadoCurso = 'PENDIENTE';
    const estadoUpper = rawEstado.toUpperCase();
    if (estadoUpper.includes('APROB')) estado = 'APROBADO';
    else if (estadoUpper.includes('CONVAL')) estado = 'CONVALIDADO';
    else if (estadoUpper.includes('CURSO') || estadoUpper.includes('MATRIC')) estado = 'EN_CURSO';

    // Normalizar Prerrequisitos
    const prerrequisitos = rawReqs
      .split(/[,;\/\-\n]+/)
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0 && !['NINGUNO', '-', 'SIN REQUISITO', 'NO TIENE'].includes(r.toUpperCase()));

    const creditos = parseFloat(rawCreditos.replace(',', '.')) || 0;
    const horasSemanales = parseFloat(rawHoras.replace(',', '.')) || 0;

    if (rawNombre.length >= 3) {
      cursos.push({
        codigo: rawCodigo || `CURSO-${cursos.length + 1}`,
        nombre: rawNombre,
        ciclo: cicloCurso,
        horasSemanales,
        creditos,
        tipo: (rawTipo.toUpperCase().includes('ELEC') ? 'ELECTIVO' : 'OBLIGATORIO') as TipoCurso,
        prerrequisitos,
        esLaboratorio: rawNombre.toLowerCase().includes('laboratorio') || 
                       rawNombre.toLowerCase().includes('integrador') ||
                       rawNombre.toLowerCase().includes('taller'),
        estado
      });
    }
  }

  return cursos;
};