import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { esEstadoJalado, ESTADOS_EXCEL_JALADO, parseUTPExcel } from '../../src/adapters/utpExcelAdapter';

const cargar = (nombre: string) => new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre);

describe('Parser - cursos jalados', () => {
  it('ESTADOS_EXCEL_JALADO se compara sin mayúsculas ni tildes', () => {
    expect(ESTADOS_EXCEL_JALADO).toEqual(['DESAPROBADO']);
    expect(esEstadoJalado('DESAPROBADO')).toBe(true);
    expect(esEstadoJalado(' desaprobádo ')).toBe(true);
    expect(esEstadoJalado('PENDIENTE')).toBe(false);
    expect(esEstadoJalado('APROBADO')).toBe(false);
  });

  it('100000I60N DESAPROBADO se importa como jalado en su ciclo 6', async () => {
    const cursos = await parseUTPExcel(cargar('Plan_de_Estudio_desaprobado.xlsx'));
    expect(cursos).toHaveLength(72);
    expect(cursos.find((curso) => curso.codigo === '100000I60N')).toMatchObject({
      nombre: 'ANÁLISIS Y DISEÑO DE SISTEMAS DE INFORMACIÓN',
      estado: 'PENDIENTE', jalado: true, ciclo: 6, cicloOrigen: 6, ubicacion: 'periodo',
    });
    expect(cursos.filter((curso) => curso.jalado).map((curso) => curso.codigo)).toEqual(['100000I60N']);
  });

  it('el Excel real no tiene jalados y sus PENDIENTE siguen en el banco', async () => {
    const cursos = await parseUTPExcel(cargar('Plan_de_Estudio_1.xlsx'));
    expect(cursos.some((curso) => curso.jalado)).toBe(false);
    expect(cursos.filter((curso) => curso.estado === 'PENDIENTE').every((curso) => curso.ubicacion === 'banco')).toBe(true);
  });
});
