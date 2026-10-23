import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Curso, PeriodoIngreso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { buildAIContext, ventanaSiJala } from '../../src/application/ai/buildAIContext';
import { mockChat } from '../../src/application/ai/mockRespuestas';
import { crearPeriodoRegular, crearPeriodoVerano } from '../../src/domain/rules/academicPeriodRules';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));

const crearStore = async (ingreso: PeriodoIngreso) => {
  const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico(ingreso, 7);
  await store.getState().setCursos(await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx')));
  return store;
};
type Store = Awaited<ReturnType<typeof crearStore>>;
const whatIfDe = (store: Store, codigo: string) => buildAIContext(store.getState()).whatIf.find((item) => item.codigo === codigo)!;

describe('A2 - what-if con la ventana concreta (regla de dominio ventanaDesdeCiclo)', () => {
  it('marzo, I62N en ciclo-8 (par: hay Verano 8) → [Verano 8, Ciclo 9]', async () => {
    const store = await crearStore('marzo');
    expect(await store.getState().moverCursoAPeriodo('100000I62N', crearPeriodoRegular(8))).toBe(true);
    expect(whatIfDe(store, '100000I62N')).toMatchObject({ origen: 'PROXIMO_PERIODO', ventanaSiJala: ['verano-8', 'ciclo-9'] });
  });

  it('marzo, curso EN_CURSO en ciclo-7 (impar: sin verano) → [Ciclo 8]', async () => {
    const store = await crearStore('marzo');
    expect(whatIfDe(store, '100000S61T')).toMatchObject({ origen: 'EN_CURSO', ventanaSiJala: ['ciclo-8'] });
  });

  it('marzo, I62N en ciclo-9 (impar: sin verano) → [Ciclo 10]', async () => {
    const store = await crearStore('marzo');
    await store.getState().moverCursoAPeriodo('100000S06I', crearPeriodoRegular(8));
    expect(await store.getState().moverCursoAPeriodo('100000I62N', crearPeriodoRegular(9))).toBe(true);
    // El ciclo 9 no es el próximo periodo: su what-if se lee desde el foco del curso.
    const { foco } = buildAIContext(store.getState(), { foco: { tipo: 'curso', id: '100000I62N' } });
    expect(foco?.tipo === 'curso' && foco.whatIf.ventanaSiJala).toEqual(['ciclo-10']);
  });

  it('agosto, curso EN_CURSO en ciclo-7 (seguido de verano) → [Verano 7, Ciclo 8]', async () => {
    const store = await crearStore('agosto');
    expect(whatIfDe(store, '100000S61T').ventanaSiJala).toEqual(['verano-7', 'ciclo-8']);
  });

  it('agosto, I62N en ciclo-8 (par: sin verano) → [Ciclo 9]', async () => {
    const store = await crearStore('agosto');
    expect(await store.getState().moverCursoAPeriodo('100000I62N', crearPeriodoRegular(8))).toBe(true);
    expect(whatIfDe(store, '100000I62N').ventanaSiJala).toEqual(['ciclo-9']);
  });

  it('el foco en un curso también lleva su ventana', async () => {
    const store = await crearStore('marzo');
    await store.getState().moverCursoAPeriodo('100000I62N', crearPeriodoRegular(8));
    const { foco } = buildAIContext(store.getState(), { foco: { tipo: 'curso', id: '100000I62N' } });
    expect(foco?.tipo === 'curso' && foco.whatIf.ventanaSiJala).toEqual(['verano-8', 'ciclo-9']);
  });

  const curso = (cambios: Partial<Curso>): Curso => ({
    codigo: 'X', nombre: 'X', ciclo: 8, cicloOrigen: 8, tipoPeriodo: 'REGULAR', ubicacion: 'periodo',
    horasSemanales: 3, creditos: 3, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE', ...cambios,
  });

  it('en un verano, la ventana es el ciclo regular siguiente; en el banco no hay ventana', () => {
    const verano = crearPeriodoVerano(8);
    expect(ventanaSiJala(curso({ ciclo: verano.cicloReferencia, tipoPeriodo: 'VERANO' }), { periodoIngreso: 'marzo' })).toEqual(['ciclo-9']);
    expect(ventanaSiJala(curso({ ubicacion: 'banco' }), { periodoIngreso: 'marzo' })).toEqual([]);
  });

  it('sin mes de ingreso no se asume verano', () => {
    expect(ventanaSiJala(curso({}), { periodoIngreso: null })).toEqual(['ciclo-9']);
  });
});

describe('A2 - el mock nombra el periodo exacto', () => {
  it('"¿Qué pasa si lo jalo?" con foco en I62N (marzo, ciclo-8)', async () => {
    const store = await crearStore('marzo');
    for (const codigo of ['100000S06I', '100000I62N']) await store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(8));
    const contexto = buildAIContext(store.getState(), { foco: { tipo: 'curso', id: '100000I62N' } });
    expect(mockChat(contexto, '¿Qué pasa si lo jalo?').texto).toContain('Tendrías que llevarlo en el Verano 8 o en el Ciclo 9');
  });

  it('con una ventana de un solo periodo: "en el Ciclo 8"', async () => {
    const store = await crearStore('marzo');
    const contexto = buildAIContext(store.getState(), { foco: { tipo: 'curso', id: '100000S61T' } });
    expect(mockChat(contexto, '¿Qué pasa si lo jalo?').texto).toContain('Tendrías que llevarlo en el Ciclo 8');
  });
});
