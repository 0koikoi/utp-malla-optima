// Hook para parsear el archivo .xlsx de la malla UTP
// Migrado de app-script.js → procesarMallaExcel()
// Agrega persistencia en localStorage (slot único)

import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useMallaStore } from '@/store/mallaStore';
import { saveMalla } from '@/utils/mallaStorage';
import type { Curso, EstadoCurso, TipoCurso } from '@/types/malla';

export function useExcelParser() {
  const setCursos = useMallaStore((s) => s.setCursos);

  const parsearExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        wb.Sheets[wb.SheetNames[0]],
        { defval: '' }
      );
      const cursos = procesarJson(json);

      // 1. Persistir en localStorage (slot único)
      saveMalla(cursos, file.name);

      // 2. Actualizar el store (actualiza asignaciones iniciales)
      setCursos(cursos, file.name);
    };
    reader.readAsArrayBuffer(file);
  }, [setCursos]);

  return { parsearExcel };
}

/** Transforma las filas JSON del xlsx al diccionario de cursos tipado */
function procesarJson(datos: Record<string, unknown>[]): Record<string, Curso> {
  const diccionario: Record<string, Curso> = {};
  let cicloActual = 1;

  // Primera pasada: construir diccionario
  for (const fila of datos) {
    const codigoRaw = String(fila['Código Curso'] ?? '').trim();
    if (!codigoRaw) continue;

    // Detectar cabecera de ciclo (ej: "CICLO 1")
    if (codigoRaw.toLowerCase().includes('ciclo')) {
      const num = codigoRaw.match(/\d+/);
      if (num) cicloActual = parseInt(num[0]);
      continue;
    }

    if (!fila['Nombre Curso'] || codigoRaw.toLowerCase().includes('nivelación')) continue;

    const estado = String(fila['Estado(***)'] ?? 'PENDIENTE').trim().toUpperCase() as EstadoCurso;
    const tipoBruto = String(fila['Tipo'] ?? 'O').trim().toUpperCase() as TipoCurso;

    diccionario[codigoRaw] = {
      codigo: codigoRaw,
      nombre: String(fila['Nombre Curso']).trim(),
      horas: parseFloat(String(fila['Horas Semanales(*)'])) || 3,
      creditos: parseFloat(String(fila['Créditos'])) || 0,
      tipo: tipoBruto,
      estado,
      prerequisitos: String(fila['Pre-Requisito'] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      habilitaA: [],
      cicloOrigen: cicloActual,
    };
  }

  // Segunda pasada: construir habilitaA (inverso de prerequisitos)
  for (const curso of Object.values(diccionario)) {
    for (const codigoPre of curso.prerequisitos) {
      if (diccionario[codigoPre]) {
        diccionario[codigoPre].habilitaA.push(curso.nombre);
      }
    }
  }

  return diccionario;
}
