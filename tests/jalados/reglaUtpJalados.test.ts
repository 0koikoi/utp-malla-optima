import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { moveCourseUseCase } from '../../src/application/usecases/moveCourseUseCase';
import { JALADO_PERMITE_VERANO } from '../../src/config/academicLimits';
import { crearPeriodoRegular, crearPeriodoVerano } from '../../src/domain/rules/academicPeriodRules';
import { periodoRecuperacion, periodosRecuperacion } from '../../src/domain/rules/jaladoRules';
import { motivoPlanificadoInvalido } from '../../src/domain/services/prerequisiteService';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { validateAcademicConfig } from '../../src/infrastructure/configuration/schemas/academicConfigValidator';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const I60N = '100000I60N';
const S72T = '100000S72T';
const CURSOS_OCTAVO = ['100000S06I', '100000S72T', '100000S73T', '100000H01C', '100000TD09', '100000I62N', '100000S71T'];

const leer = (nombre: string) => new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre);

const crearStore = async (excel: string, ingreso: 'marzo' | 'agosto' = 'marzo') => {
  const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico(ingreso, 7);
  await store.getState().setCursos(await parseUTPExcel(leer(excel)));
  return store;
};

type Store = Awaited<ReturnType<typeof crearStore>>;
const curso = (store: Store, codigo: string) => store.getState().cursos.find((item) => item.codigo === codigo)!;
const mover = (store: Store, codigo: string, ciclo: number) =>
  store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(ciclo));
const aviso = (store: Store) => store.getState().notificacionMovimiento;

describe('Configuración jaladoPermiteVerano', () => {
  it('es false por defecto en academic.json', () => {
    expect(JALADO_PERMITE_VERANO).toBe(false);
  });

  it('Zod solo acepta un booleano', () => {
    expect(validateAcademicConfig({ jaladoPermiteVerano: true }).jaladoPermiteVerano).toBe(true);
    expect(() => validateAcademicConfig({ jaladoPermiteVerano: 'sí' })).toThrow();
  });

  it('con true, el verano del ciclo actual también es periodo de recuperación', () => {
    const contexto = { cicloActual: 7, periodoIngreso: 'agosto' as const };
    expect(periodosRecuperacion([], contexto).map((periodo) => periodo.id)).toEqual(['ciclo-8']);
    expect(periodosRecuperacion([], { ...contexto, jaladoPermiteVerano: true }).map((periodo) => periodo.id))
      .toEqual(['verano-7', 'ciclo-8']);
    // Con ingreso marzo no hay verano después del ciclo 7.
    expect(periodosRecuperacion([], { ...contexto, periodoIngreso: 'marzo', jaladoPermiteVerano: true })
      .map((periodo) => periodo.id)).toEqual(['ciclo-8']);
  });
});

describe('Regla UTP con Plan_de_Estudio_desaprobado.xlsx (I60N jalado)', () => {
  it('el periodo de recuperación es ciclo-8', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    expect(periodoRecuperacion(store.getState().cursos, store.getState())?.id).toBe('ciclo-8');
  });

  it('sin I60N en ciclo-8, S72T se rechaza en ciclo-8 y ciclo-9', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    for (const ciclo of [8, 9]) {
      expect(await mover(store, S72T, ciclo)).toBe(false);
      expect(aviso(store)).toMatchObject({ tipo: 'JALADO_OBLIGATORIO',
        mensaje: 'Primero agrega tus cursos jalados al Ciclo 8: ANÁLISIS Y DISEÑO DE SISTEMAS DE INFORMACIÓN.' });
    }
    // Un curso sin relación con I60N tampoco entra.
    expect(await mover(store, '100000H01C', 8)).toBe(false);
  });

  it('con I60N en ciclo-8, S72T se acepta en ciclo-9 y se rechaza en ciclo-8 por prerrequisito', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    expect(await mover(store, I60N, 8)).toBe(true);
    expect(await mover(store, S72T, 8)).toBe(false);
    expect(aviso(store)?.tipo).toBe('PRERREQUISITOS');
    expect(await mover(store, S72T, 9)).toBe(true);
  });

  it('I60N no se puede mover a ciclo-9 ni al banco', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    expect(await mover(store, I60N, 9)).toBe(false);
    expect(aviso(store)).toMatchObject({ tipo: 'JALADO_OBLIGATORIO', mensaje: 'Un curso jalado debe llevarse en el Ciclo 8.' });
    expect(await store.getState().moverCursoABanco(I60N)).toBe(false);
    expect(aviso(store)?.mensaje).toBe('Un curso jalado debe llevarse en el Ciclo 8.');
    expect(curso(store, I60N)).toMatchObject({ ciclo: 6, ubicacion: 'periodo' });
  });

  it('verano-7: se rechaza con jaladoPermiteVerano false y se acepta con true', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx', 'agosto');
    const { cursos } = store.getState();
    const contexto = { cicloActual: 7, periodoIngreso: 'agosto' as const };
    const conFalse = moveCourseUseCase(cursos, I60N, crearPeriodoVerano(7), { ...contexto, jaladoPermiteVerano: false });
    expect(!conFalse.ok && conFalse.reason).toBe('JALADO_DESTINO');
    expect(moveCourseUseCase(cursos, I60N, crearPeriodoVerano(7), { ...contexto, jaladoPermiteVerano: true }).ok).toBe(true);
    // El store usa la configuración por defecto (false).
    expect(await store.getState().moverCursoAVerano(I60N, 7)).toBe(false);
  });

  it('con true y I60N en verano-7, los demás cursos ya pueden ir a ciclo-8', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx', 'agosto');
    const contexto = { cicloActual: 7, periodoIngreso: 'agosto' as const, jaladoPermiteVerano: true };
    const enVerano = moveCourseUseCase(store.getState().cursos, I60N, crearPeriodoVerano(7), contexto);
    expect(enVerano.ok).toBe(true);
    const cursos = enVerano.ok ? enVerano.cursos : [];
    expect(moveCourseUseCase(cursos, S72T, crearPeriodoRegular(8), contexto).ok).toBe(true);
  });

  it('sacar I60N de ciclo-8 deja inválidos los cursos ya planificados en ciclo-9', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    await mover(store, I60N, 8);
    await mover(store, S72T, 9);
    await mover(store, '100000H01C', 9);
    expect(await mover(store, I60N, 6)).toBe(true);
    expect(curso(store, I60N)).toMatchObject({ ciclo: 6, ubicacion: 'periodo', jalado: true });
    const { cursos } = store.getState();
    expect(motivoPlanificadoInvalido(curso(store, S72T), cursos, store.getState())).toBe('JALADO_PENDIENTE');
    expect(motivoPlanificadoInvalido(curso(store, '100000H01C'), cursos, store.getState())).toBe('JALADO_PENDIENTE');
    // No se mueven: siguen en ciclo-9.
    expect(curso(store, S72T)).toMatchObject({ ciclo: 9, ubicacion: 'periodo' });
    expect(aviso(store)?.faltantes?.map((item) => item.codigo).sort()).toEqual(['100000H01C', S72T]);
  });

  it('"Agregar jalados a este ciclo" mueve I60N a ciclo-8', async () => {
    const store = await crearStore('Plan_de_Estudio_desaprobado.xlsx');
    expect(await store.getState().agregarJaladosARecuperacion()).toBe(true);
    expect(curso(store, I60N)).toMatchObject({ ciclo: 8, ubicacion: 'periodo' });
  });
});

describe('Regla UTP con S61T marcado como jalado (Excel real)', () => {
  const crearConS61T = async () => {
    const store = await crearStore('Plan_de_Estudio_1.xlsx');
    await store.getState().marcarComoJalado('100000S61T');
    return store;
  };

  it('el toast indica dónde deberá llevarlo', async () => {
    const store = await crearConS61T();
    expect(aviso(store)?.mensaje).toContain('Deberás llevarlo en el Ciclo 8.');
  });

  it('nada entra a ciclo-8 o después hasta agregar S61T; luego sí', async () => {
    const store = await crearConS61T();
    expect(await mover(store, '100000H01C', 8)).toBe(false);
    expect(await mover(store, '100000H01C', 9)).toBe(false);
    expect(aviso(store)?.mensaje).toBe('Primero agrega tus cursos jalados al Ciclo 8: HERRAMIENTAS DE DESARROLLO.');
    expect(await mover(store, '100000S61T', 9)).toBe(false);
    expect(await mover(store, '100000S61T', 8)).toBe(true);
    expect(await mover(store, '100000H01C', 8)).toBe(true);
    expect(await mover(store, '100000I62N', 8)).toBe(false);
    expect(aviso(store)?.tipo).toBe('PRERREQUISITOS');
    expect(await mover(store, '100000I62N', 9)).toBe(true);
  });

  it('si S61T vuelve al Ciclo 7, lo planificado en ciclo-8 queda inválido', async () => {
    const store = await crearConS61T();
    await mover(store, '100000S61T', 8);
    await mover(store, '100000H01C', 8);
    expect(await mover(store, '100000S61T', 7)).toBe(true);
    expect(motivoPlanificadoInvalido(curso(store, '100000H01C'), store.getState().cursos, store.getState()))
      .toBe('JALADO_PENDIENTE');
  });
});

describe('Sin jalados no cambia nada', () => {
  it('los 7 del 8vo se planifican en ciclo-8 y los totales siguen iguales', async () => {
    const store = await crearStore('Plan_de_Estudio_1.xlsx');
    for (const codigo of CURSOS_OCTAVO) expect(await mover(store, codigo, 8), codigo).toBe(true);
    const { cursos, tarifario, disciplinaActiva, cicloActual } = store.getState();
    const service = new FinancialPlanningService(new UniversityFinancialRulesProvider());
    const total = (opciones: object) => service.calcular(cursos, tarifario!, disciplinaActiva, { cicloActual, ...opciones }).totalGeneral;
    expect(total({ metodoPago: 'sin_descuento' })).toBe(5055.15);
    expect(total({ metodoPago: 'interbank_scotiabank' })).toBe(4822.3);
    expect(total({ metodoPago: 'bcp_bbva' })).toBe(4938.7);
    expect(total({ metodoPago: 'sin_descuento', pagoUnicoPorPeriodo: { 'ciclo-8': true } })).toBe(4705.86);
    expect(cursos.filter((item: Curso) => motivoPlanificadoInvalido(item, cursos, store.getState()))).toEqual([]);
  });
});
