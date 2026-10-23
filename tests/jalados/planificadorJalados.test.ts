import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { obtenerPeriodoCurso } from '../../src/domain/rules/academicPeriodRules';
import { calcularHorasEfectivas, LIMITE_HORAS_PLANIFICACION } from '../../src/domain/rules/planningRules';
import { validarCargaPlanificacionAutomatica } from '../../src/domain/services/automaticPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const leer = (nombre: string) => new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre);

const crearStore = async (excel: string) => {
  const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico('marzo', 7);
  await store.getState().setCursos(await parseUTPExcel(leer(excel)));
  return store;
};

const periodoDe = (cursos: { codigo: string; ciclo: number; tipoPeriodo: 'REGULAR' | 'VERANO'; ubicacion: string }[], codigo: string) => {
  const curso = cursos.find((item) => item.codigo === codigo)!;
  return curso.ubicacion === 'periodo' ? obtenerPeriodoCurso(curso).id : 'banco';
};

describe('Planificador automático con jalados', () => {
  it('con S61T jalado pone S61T en ciclo-8 y no pone I62N en ciclo-8', async () => {
    const store = await crearStore('Plan_de_Estudio_1.xlsx');
    await store.getState().marcarComoJalado('100000S61T');
    const propuesta = store.getState().previsualizarPlanificacionOptima();
    expect(periodoDe(propuesta.cursos, '100000S61T')).toBe('ciclo-8');
    expect(periodoDe(propuesta.cursos, '100000I62N')).not.toBe('ciclo-8');
    expect(propuesta.ciclos.find((ciclo) => ciclo.periodo.id === 'ciclo-8')?.cursos.map((curso) => curso.codigo))
      .toContain('100000S61T');
    const ciclo8 = propuesta.cursos.filter((curso) => curso.ubicacion === 'periodo' && obtenerPeriodoCurso(curso).id === 'ciclo-8');
    expect(calcularHorasEfectivas(ciclo8, 'REGULAR')).toBeLessThanOrEqual(LIMITE_HORAS_PLANIFICACION);
    expect(() => validarCargaPlanificacionAutomatica(propuesta)).not.toThrow();
    // El jalado se explica aparte; no cuenta como asignación conservada.
    expect(propuesta.explicacion).toContainEqual({ tipo: 'JALADOS_PRIMERO', total: 1, periodos: ['Ciclo 8'] });
    expect(propuesta.totalConservados).toBe(0);
  });

  it('con I60N jalado lo pone en ciclo-8 y sus dependientes después', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    const propuesta = store.getState().previsualizarPlanificacionOptima();
    expect(periodoDe(propuesta.cursos, '100000I60N')).toBe('ciclo-8');
    for (const codigo of ['100000S06I', '100000S72T', '100000TD09']) {
      expect(periodoDe(propuesta.cursos, codigo), codigo).not.toBe('ciclo-8');
    }
  });

  it('al aplicar la propuesta no queda ningún curso inválido por jalados', async () => {
    const store = await crearStore('Plan_de_Estudio_1.xlsx');
    await store.getState().marcarComoJalado('100000S61T');
    await store.getState().generarPlanificacionOptima();
    const { motivoPlanificadoInvalido } = await import('../../src/domain/services/prerequisiteService');
    const { cursos } = store.getState();
    expect(cursos.filter((curso) => motivoPlanificadoInvalido(curso, cursos, store.getState()))).toEqual([]);
  });
});
