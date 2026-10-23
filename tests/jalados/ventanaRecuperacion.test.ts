import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PeriodoIngreso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { crearPeriodoRegular, crearPeriodoVerano, obtenerPeriodoCurso } from '../../src/domain/rules/academicPeriodRules';
import { ventanaJalado } from '../../src/domain/rules/jaladoRules';
import { validarCargaPlanificacionAutomatica } from '../../src/domain/services/automaticPlanningService';
import { explicarPlan } from '../../src/presentation/messages/planningMessages';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const S61T = '100000S61T';
const H01C = '100000H01C';
const I60N = '100000I60N';

const leer = (nombre: string) => new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre);

/** Variantes del perfil (ingreso y ciclo actual) sobre el mismo Excel. */
const crearStore = async (ingreso: PeriodoIngreso, cicloActual: number, excel = 'Plan_de_Estudio_1.xlsx') => {
  const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico(ingreso, cicloActual);
  await store.getState().setCursos(await parseUTPExcel(leer(excel)));
  return store;
};

/** S61T está EN_CURSO; con el ciclo actual N queda jalado en el Ciclo N. */
const conS61TJalado = async (ingreso: PeriodoIngreso, cicloActual: number) => {
  const store = await crearStore(ingreso, cicloActual);
  await store.getState().marcarComoJalado(S61T);
  return store;
};

type Store = Awaited<ReturnType<typeof crearStore>>;
const curso = (store: Store, codigo: string) => store.getState().cursos.find((item) => item.codigo === codigo)!;
const ventana = (store: Store, codigo: string) =>
  ventanaJalado(curso(store, codigo), store.getState().cursos, store.getState()).map((periodo) => periodo.id);
const moverVerano = (store: Store, codigo: string, ciclo: number) =>
  store.getState().moverCursoAPeriodo(codigo, crearPeriodoVerano(ciclo));
const moverCiclo = (store: Store, codigo: string, ciclo: number) =>
  store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(ciclo));
const periodoPropuesto = (store: Store, codigo: string) => {
  const propuesto = store.getState().previsualizarPlanificacionOptima().cursos.find((item) => item.codigo === codigo)!;
  return propuesto.ubicacion === 'periodo' ? obtenerPeriodoCurso(propuesto).id : 'banco';
};

describe('Ventana de recuperación según el calendario UTP', () => {
  it('agosto, jalado en Ciclo 1: válido en Verano 1 y en Ciclo 2; rechazado en Ciclo 3', async () => {
    const store = await conS61TJalado('agosto', 1);
    expect(curso(store, S61T)).toMatchObject({ ciclo: 1, jalado: true, cicloJalado: 1 });
    expect(ventana(store, S61T)).toEqual(['verano-1', 'ciclo-2']);
    expect(await moverCiclo(store, S61T, 3)).toBe(false);
    expect(store.getState().notificacionMovimiento).toMatchObject({ tipo: 'JALADO_OBLIGATORIO',
      mensaje: 'Un curso jalado debe llevarse en el Verano 1 o en el Ciclo 2.' });
    expect(await moverVerano(store, S61T, 1)).toBe(true);
    expect(await moverCiclo(store, S61T, 2)).toBe(true);
    expect(await moverCiclo(store, S61T, 3)).toBe(false);
  });

  it('agosto, jalado en Ciclo 1: el planificador lo pone en Verano 1', async () => {
    const store = await conS61TJalado('agosto', 1);
    const propuesta = store.getState().previsualizarPlanificacionOptima();
    expect(periodoPropuesto(store, S61T)).toBe('verano-1');
    expect(propuesta.ciclos[0]).toMatchObject({ periodo: { id: 'verano-1' }, cursos: [{ codigo: S61T }] });
    expect(propuesta.explicacion).toContainEqual({ tipo: 'JALADOS_PRIMERO', total: 1, periodos: ['Verano 1'] });
    expect(explicarPlan(propuesta.explicacion.find((item) => item.tipo === 'JALADOS_PRIMERO')!))
      .toContain('en el Verano 1');
    expect(() => validarCargaPlanificacionAutomatica(propuesta)).not.toThrow();
    await store.getState().generarPlanificacionOptima();
    expect(curso(store, S61T)).toMatchObject({ ciclo: 1, tipoPeriodo: 'VERANO', ubicacion: 'periodo' });
  });

  it('marzo, jalado en Ciclo 1: válido solo en Ciclo 2; no existe Verano 1', async () => {
    const store = await conS61TJalado('marzo', 1);
    expect(ventana(store, S61T)).toEqual(['ciclo-2']);
    expect(await moverVerano(store, S61T, 1)).toBe(false);
    expect(await moverCiclo(store, S61T, 3)).toBe(false);
    expect(store.getState().notificacionMovimiento?.mensaje).toBe('Un curso jalado debe llevarse en el Ciclo 2.');
    expect(await moverCiclo(store, S61T, 2)).toBe(true);
  });

  it('marzo, jalado en Ciclo 2: válido en Verano 2 y en Ciclo 3; rechazado en Ciclo 4', async () => {
    const store = await conS61TJalado('marzo', 2);
    expect(ventana(store, S61T)).toEqual(['verano-2', 'ciclo-3']);
    expect(await moverCiclo(store, S61T, 4)).toBe(false);
    expect(await moverVerano(store, S61T, 2)).toBe(true);
    expect(await moverCiclo(store, S61T, 3)).toBe(true);
    expect(await moverCiclo(store, S61T, 4)).toBe(false);
  });

  it('marzo, jalado en Ciclo 2: el planificador lo pone en Verano 2', async () => {
    const store = await conS61TJalado('marzo', 2);
    expect(periodoPropuesto(store, S61T)).toBe('verano-2');
  });

  it('marzo, ciclo actual 7, S61T jalado: ventana [Ciclo 8]', async () => {
    const store = await conS61TJalado('marzo', 7);
    expect(ventana(store, S61T)).toEqual(['ciclo-8']);
    expect(store.getState().notificacionMovimiento?.mensaje).toContain('Deberás llevarlo en el Ciclo 8.');
  });

  it('agosto, ciclo actual 7, S61T jalado: ventana [Verano 7, Ciclo 8]', async () => {
    const store = await conS61TJalado('agosto', 7);
    expect(ventana(store, S61T)).toEqual(['verano-7', 'ciclo-8']);
    expect(store.getState().notificacionMovimiento?.mensaje).toContain('Deberás llevarlo en el Verano 7 o en el Ciclo 8.');
    expect(periodoPropuesto(store, S61T)).toBe('verano-7');
  });

  it('Plan_de_Estudio_desaprobado.xlsx (marzo, actual 7, I60N jalado en Ciclo 6): ventana [Ciclo 8]', async () => {
    const store = await crearStore('marzo', 7, 'Plan_de_Estudio_desaprobado.xlsx');
    expect(curso(store, I60N)).toMatchObject({ ciclo: 6, jalado: true });
    expect(ventana(store, I60N)).toEqual(['ciclo-8']);
  });
});

describe('Otros cursos frente a la ventana', () => {
  it('con el jalado fuera de su ventana, Verano N y Ciclo N+1 rechazan otros cursos', async () => {
    const store = await conS61TJalado('agosto', 7);
    expect(await moverVerano(store, H01C, 7)).toBe(false);
    expect(store.getState().notificacionMovimiento).toMatchObject({ tipo: 'JALADO_OBLIGATORIO',
      mensaje: 'Debes llevar primero HERRAMIENTAS DE DESARROLLO en el Verano 7 o en el Ciclo 8.' });
    expect(await moverCiclo(store, H01C, 8)).toBe(false);
    expect(await moverCiclo(store, H01C, 9)).toBe(false);
  });

  it('con el jalado en Verano N, el Ciclo N+1 y ese verano aceptan otros cursos', async () => {
    const store = await conS61TJalado('agosto', 7);
    expect(await moverVerano(store, S61T, 7)).toBe(true);
    expect(await moverCiclo(store, H01C, 8)).toBe(true);
    expect(await moverVerano(store, '100000TD09', 7)).toBe(true);
  });

  it('con el jalado en Ciclo N+1, el Verano N sigue sin aceptar otros cursos', async () => {
    const store = await conS61TJalado('agosto', 7);
    expect(await moverCiclo(store, S61T, 8)).toBe(true);
    expect(await moverCiclo(store, H01C, 8)).toBe(true);
    expect(await moverVerano(store, '100000TD09', 7)).toBe(false);
  });

  it('con varios jalados la regla se aplica a cada uno', async () => {
    const store = await conS61TJalado('agosto', 7);
    await store.getState().marcarComoJalado('100000I45N');
    expect(await moverVerano(store, S61T, 7)).toBe(true);
    // Falta I45N: el Ciclo 8 sigue cerrado para los demás.
    expect(await moverCiclo(store, H01C, 8)).toBe(false);
    expect(await moverCiclo(store, '100000I45N', 8)).toBe(true);
    expect(await moverCiclo(store, H01C, 8)).toBe(true);
  });

  it('"Agregar jalados a este verano" los mueve a ese verano', async () => {
    const store = await conS61TJalado('agosto', 7);
    expect(await store.getState().agregarJaladosARecuperacion(crearPeriodoVerano(7))).toBe(true);
    expect(curso(store, S61T)).toMatchObject({ ciclo: 7, tipoPeriodo: 'VERANO', ubicacion: 'periodo' });
  });
});

describe('Sin jalados', () => {
  it.each(['marzo', 'agosto'] as const)('los totales de caracterización no cambian (%s)', async (ingreso) => {
    const store = await crearStore(ingreso, 7);
    for (const codigo of ['100000S06I', '100000S72T', '100000S73T', H01C, '100000TD09', '100000I62N', '100000S71T']) {
      expect(await moverCiclo(store, codigo, 8), codigo).toBe(true);
    }
    const { cursos, tarifario, disciplinaActiva, cicloActual } = store.getState();
    const service = new FinancialPlanningService(new UniversityFinancialRulesProvider());
    expect(service.calcular(cursos, tarifario!, disciplinaActiva, { cicloActual }).totalGeneral).toBe(5055.15);
  });
});
