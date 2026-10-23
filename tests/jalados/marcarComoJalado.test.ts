import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import { esPlanificadoInvalido } from '../../src/domain/services/prerequisiteService';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));
const CURSOS_OCTAVO = ['100000S06I', '100000S72T', '100000S73T', '100000H01C', '100000TD09', '100000I62N', '100000S71T'];

const crearStoreConOctavo = async () => {
  const { repos, cursosPersistidos } = crearRepositoriosEnMemoria();
  const store = createAcademicStore(repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico('marzo', 7);
  await store.getState().setCursos(await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx')));
  for (const codigo of CURSOS_OCTAVO) {
    expect(await store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(8)), codigo).toBe(true);
  }
  return { store, cursosPersistidos };
};

type Contexto = Awaited<ReturnType<typeof crearStoreConOctavo>>;

const cotizar = ({ store }: Contexto) => {
  const { cursos, tarifario, disciplinaActiva, cicloActual } = store.getState();
  return new FinancialPlanningService(new UniversityFinancialRulesProvider())
    .calcular(cursos, tarifario!, disciplinaActiva, { cicloActual });
};

describe('marcarComoJalado / desmarcarJalado con el 8vo en ciclo-8', () => {
  let ctx: Contexto;
  beforeEach(async () => { ctx = await crearStoreConOctavo(); });

  const curso = (codigo: string) => ctx.store.getState().cursos.find((item) => item.codigo === codigo)!;
  const invalido = (codigo: string) =>
    esPlanificadoInvalido(curso(codigo), ctx.store.getState().cursos, ctx.store.getState());

  it('sin jalados los totales siguen iguales a la caracterización', () => {
    expect(cotizar(ctx).totalGeneral).toBe(5055.15);
  });

  it('S61T queda jalado en el Ciclo 7, no se cotiza y deja I62N inválido', async () => {
    const invalidos = await ctx.store.getState().marcarComoJalado('100000S61T');
    expect(invalidos?.map((item) => item.codigo)).toEqual(['100000I62N']);
    expect(curso('100000S61T')).toMatchObject({ estado: 'PENDIENTE', jalado: true, ciclo: 7, ubicacion: 'periodo' });
    expect(ctx.cursosPersistidos.get('100000S61T')).toMatchObject({ estado: 'PENDIENTE', jalado: true });
    expect(ctx.store.getState().notificacionMovimiento).toMatchObject({
      tipo: 'JALADO', deshacerJalado: '100000S61T', faltantes: [{ codigo: '100000I62N' }],
    });
    // I62N sigue en ciclo-8: no se mueve, solo queda inválido.
    expect(curso('100000I62N')).toMatchObject({ ciclo: 8, ubicacion: 'periodo' });
    expect(invalido('100000I62N')).toBe(true);
    // Regla UTP: mientras S61T no esté en ciclo-8, todo lo planificado allí queda marcado.
    expect(invalido('100000S73T')).toBe(true);
    expect(cotizar(ctx).periodos.map((periodo) => periodo.id)).toEqual(['ciclo-8']);
    expect(cotizar(ctx).totalGeneral).toBe(5055.15);
  });

  it('S61T jalado se puede mover al Ciclo 8, donde se cotiza', async () => {
    await ctx.store.getState().marcarComoJalado('100000S61T');
    expect(await ctx.store.getState().moverCursoAPeriodo('100000S61T', crearPeriodoRegular(8))).toBe(true);
    const ciclo8 = cotizar(ctx).periodos.find((periodo) => periodo.id === 'ciclo-8')!;
    expect(ciclo8.cursos.map((item) => item.codigo)).toContain('100000S61T');
    // En el mismo ciclo no cumple para I62N: sigue inválido.
    expect(invalido('100000I62N')).toBe(true);
  });

  it('solo aplica a cursos EN_CURSO', async () => {
    expect(await ctx.store.getState().marcarComoJalado('100000I62N')).toBeNull();
    expect(await ctx.store.getState().marcarComoJalado('100000I60N')).toBeNull();
    expect(curso('100000I60N').estado).toBe('APROBADO');
  });

  it('desmarcarJalado lo revierte todo', async () => {
    const antes = structuredClone(ctx.store.getState().cursos);
    await ctx.store.getState().marcarComoJalado('100000S61T');
    expect(await ctx.store.getState().desmarcarJalado('100000S61T')).toBe(true);
    expect(ctx.store.getState().cursos).toEqual(antes);
    expect(ctx.cursosPersistidos.get('100000S61T')).toMatchObject({ estado: 'EN_CURSO', ciclo: 7, ubicacion: 'periodo' });
    expect(ctx.cursosPersistidos.get('100000S61T')?.jalado).toBeUndefined();
    expect(invalido('100000I62N')).toBe(false);
    expect(cotizar(ctx).totalGeneral).toBe(5055.15);
  });
});
