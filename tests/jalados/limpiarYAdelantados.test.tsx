import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { CourseCard } from '../../src/components/CourseCard';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { useAcademicStore } from '../../src/store/useAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const I60N = '100000I60N';
const leer = (nombre: string) => new File(
  [readFileSync(fileURLToPath(new URL(`../fixtures/${nombre}`, import.meta.url)))], nombre);

const crearStore = async (cicloActual: number) => {
  const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico('marzo', cicloActual);
  await store.getState().setCursos(await parseUTPExcel(leer('Plan_de_Estudio_desaprobado.xlsx')));
  return store;
};
type Store = Awaited<ReturnType<typeof crearStore>>;
const curso = (store: Store, codigo: string) => store.getState().cursos.find((item) => item.codigo === codigo)!;
const cotizados = (store: Store) => {
  const { cursos, tarifario, disciplinaActiva, cicloActual } = store.getState();
  return new FinancialPlanningService(new UniversityFinancialRulesProvider())
    .calcular(cursos, tarifario!, disciplinaActiva, { cicloActual }).periodos.flatMap((periodo) => periodo.cursos.map((item) => item.codigo));
};

describe('"Limpiar plan" con jalados', () => {
  it('un jalado replanificado vuelve a su ciclo original, no al banco', async () => {
    const store = await crearStore(7);
    expect(await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(8))).toBe(true);
    await store.getState().reiniciarPlanificacion();
    expect(curso(store, I60N)).toMatchObject({ ciclo: 6, tipoPeriodo: 'REGULAR', ubicacion: 'periodo', jalado: true });
  });
});

describe('Jalado adelantado (ciclo de origen mayor que el actual)', () => {
  // Con ciclo actual 5, I60N (6to ciclo) se jaló adelantado.
  it('se importa en el banco y es obligatorio en el periodo de recuperación (ciclo-6)', async () => {
    const store = await crearStore(5);
    expect(curso(store, I60N)).toMatchObject({ ubicacion: 'banco', jalado: true, cicloJalado: 6 });
    expect(cotizados(store)).not.toContain(I60N);
    expect(await store.getState().moverCursoAPeriodo('100000S71T', crearPeriodoRegular(6))).toBe(false);
    expect(store.getState().notificacionMovimiento?.mensaje)
      .toBe('Primero agrega tus cursos jalados al Ciclo 6: ANÁLISIS Y DISEÑO DE SISTEMAS DE INFORMACIÓN.');
  });

  it('se cotiza al planificarlo en ciclo-6 y puede volver al banco', async () => {
    const store = await crearStore(5);
    expect(await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(7))).toBe(false);
    expect(await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(6))).toBe(true);
    expect(cotizados(store)).toContain(I60N);
    expect(await store.getState().moverCursoABanco(I60N)).toBe(true);
    expect(curso(store, I60N).ubicacion).toBe('banco');
  });

  it('"Limpiar plan" lo devuelve al banco', async () => {
    const store = await crearStore(5);
    await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(6));
    await store.getState().reiniciarPlanificacion();
    expect(curso(store, I60N).ubicacion).toBe('banco');
  });

  it('en el banco muestra "Jalado · llevar en Ciclo 6"', async () => {
    const store = await crearStore(5);
    const estado = { cursos: store.getState().cursos, cicloActual: 5, periodoIngreso: 'marzo' as const };
    // En render de servidor zustand lee getInitialState(), así que se siembra también ahí.
    Object.assign(useAcademicStore.getInitialState(), estado);
    useAcademicStore.setState(estado);
    expect(renderToStaticMarkup(<CourseCard curso={curso(store, I60N)} compacto />)).toContain('Jalado · llevar en Ciclo 6');
  });
});
