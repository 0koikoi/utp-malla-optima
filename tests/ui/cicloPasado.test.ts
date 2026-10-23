import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { resumenCicloPasado } from '../../src/presentation/selectors/plannerCardRules';

const cargar = async (nombre: string) => parseUTPExcel(new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre));

const filaCiclo = (cursos: Awaited<ReturnType<typeof cargar>>, ciclo: number) =>
  cursos.filter((curso) => curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === ciclo);

describe('Ciclos pasados con información', () => {
  it('Ciclo 6 del Excel real: 24 h sem y 21 cr llevados, sin jalados', async () => {
    const cursos = await cargar('Plan_de_Estudio_1.xlsx');
    expect(resumenCicloPasado(filaCiclo(cursos, 6), 7)).toEqual({ horas: 24, creditos: 21, creditosJalados: 0 });
  });

  it('Ciclo 6 con I60N jalado: el jalado suma a lo llevado y aparte como cr jalados', async () => {
    const cursos = await cargar('Plan_de_Estudio_desaprobado.xlsx');
    expect(resumenCicloPasado(filaCiclo(cursos, 6), 7)).toEqual({ horas: 24, creditos: 21, creditosJalados: 4 });
  });

  it('un PENDIENTE normal no cuenta como llevado', async () => {
    const cursos = await cargar('Plan_de_Estudio_1.xlsx');
    const pendiente = { ...cursos.find((curso) => curso.codigo === '100000S73T')!, ciclo: 6, ubicacion: 'periodo' as const };
    expect(resumenCicloPasado([...filaCiclo(cursos, 6), pendiente], 7)).toEqual({ horas: 24, creditos: 21, creditosJalados: 0 });
  });
});
