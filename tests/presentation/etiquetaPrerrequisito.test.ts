import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { etiquetaPrerrequisito } from '../../src/presentation/selectors/plannerCardRules';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));

describe('Bug #7 - prerrequisitos fuera de la malla', () => {
  it('un prerrequisito de nivelación se muestra como fuera de la malla', async () => {
    const cursos = await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx'));
    // MATEMÁTICA I (100000I0N2) exige 100000X104, que es de Nivelación y no se importa.
    expect(cursos.find((curso) => curso.codigo === '100000I0N2')?.prerrequisitos).toEqual(['100000X104']);
    expect(etiquetaPrerrequisito('100000X104', cursos)).toBe('100000X104 (nivelación / fuera de la malla)');
  });

  it('un prerrequisito de la malla muestra código y nombre', async () => {
    const cursos = await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx'));
    const s61t = cursos.find((curso) => curso.codigo === '100000S61T')!;
    expect(etiquetaPrerrequisito('100000S61T', cursos)).toBe(`100000S61T · ${s61t.nombre}`);
  });
});
