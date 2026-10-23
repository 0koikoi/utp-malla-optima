import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { contarAvance } from '../../src/presentation/selectors/plannerCardRules';

const cargar = async (nombre: string) => parseUTPExcel(new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre));

const total = (avance: ReturnType<typeof contarAvance>) =>
  avance.llevados + avance.planificados + avance.pendientes + avance.enCurso;

describe('Contadores del encabezado', () => {
  it('con Plan_de_Estudio_desaprobado.xlsx el jalado en su ciclo cuenta como pendiente y suman 72', async () => {
    const avance = contarAvance(await cargar('Plan_de_Estudio_desaprobado.xlsx'), 7);
    expect(avance).toEqual({ llevados: 41, enCurso: 7, planificados: 0, pendientes: 24 });
    expect(total(avance)).toBe(72);
  });

  it('con el Excel real también suman 72', async () => {
    const avance = contarAvance(await cargar('Plan_de_Estudio_1.xlsx'), 7);
    expect(avance).toEqual({ llevados: 42, enCurso: 7, planificados: 0, pendientes: 23 });
    expect(total(avance)).toBe(72);
  });

  it('un jalado replanificado cuenta como planificado', async () => {
    const cursos = (await cargar('Plan_de_Estudio_desaprobado.xlsx'))
      .map((curso) => curso.jalado ? { ...curso, ciclo: 8 } : curso);
    const avance = contarAvance(cursos, 7);
    expect(avance.planificados).toBe(1);
    expect(total(avance)).toBe(72);
  });
});
