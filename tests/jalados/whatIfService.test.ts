import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { simularJalado } from '../../src/domain/services/whatIfService';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));
const CURSOS_OCTAVO = ['100000S06I', '100000S72T', '100000S73T', '100000H01C', '100000TD09', '100000I62N', '100000S71T'];

let cursos: Curso[];
beforeAll(async () => {
  cursos = await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx'));
});

const bloqueados = (codigo: string, malla = cursos) =>
  simularJalado(codigo, malla).cursosBloqueados.map((curso) => curso.codigo);

describe('simularJalado con el Excel real', () => {
  it('S61T bloquea I62N, S02I y S09I', () => {
    expect(bloqueados('100000S61T')).toEqual(['100000I62N', '100000S02I', '100000S09I']);
    expect(simularJalado('100000S61T', cursos).cursosBloqueados[0])
      .toEqual({ codigo: '100000I62N', nombre: 'INTELIGENCIA DE NEGOCIOS', cicloOrigen: 8 });
  });

  it('SI67 bloquea S73T y SI87', () => {
    expect(bloqueados('100000SI67')).toEqual(['100000S73T', '100000SI87']);
  });

  it.each(['100000ST61', '100000I45N', '100000SI69', '100000SI68', '100000SI66'])('%s no bloquea ningún curso', (codigo) => {
    expect(simularJalado(codigo, cursos)).toEqual({ cursosBloqueados: [], planificadosInvalidos: [] });
  });

  it('sin nada planificado no hay planificados inválidos', () => {
    expect(simularJalado('100000S61T', cursos).planificadosInvalidos).toEqual([]);
  });

  it('con el 8vo en ciclo-8, S61T invalida I62N planificado', () => {
    const planificados = cursos.map((curso) => CURSOS_OCTAVO.includes(curso.codigo)
      ? { ...curso, ciclo: 8, ubicacion: 'periodo' as const } : curso);
    expect(simularJalado('100000S61T', planificados).planificadosInvalidos)
      .toEqual([{ codigo: '100000I62N', periodoId: 'ciclo-8' }]);
    expect(simularJalado('100000SI67', planificados).planificadosInvalidos)
      .toEqual([{ codigo: '100000S73T', periodoId: 'ciclo-8' }]);
  });

  it('es pura: no modifica los cursos recibidos', () => {
    const copia = structuredClone(cursos);
    simularJalado('100000S61T', cursos);
    expect(cursos).toEqual(copia);
  });

  it('un código inexistente no bloquea nada', () => {
    expect(simularJalado('NO-EXISTE', cursos)).toEqual({ cursosBloqueados: [], planificadosInvalidos: [] });
  });
});
