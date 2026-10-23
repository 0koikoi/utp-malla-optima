import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { CicloRow } from '../../src/components/CicloRow';
import { PrerequisitoToast } from '../../src/components/PrerequisitoToast';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import { FinancialPlanningContext } from '../../src/financial/FinancialPlanningContext';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { notificacionJalado, notificacionJaladoRetirado } from '../../src/presentation/messages/movementMessages';
import { explicarPlan } from '../../src/presentation/messages/planningMessages';
import { textoCreditos } from '../../src/presentation/selectors/plannerCardRules';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { useAcademicStore } from '../../src/store/useAcademicStore';
import { pluralizar } from '../../src/utils/pluralizar';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const S61T = '100000S61T';
const I45N = '100000I45N';
const A = { codigo: 'A', nombre: 'CURSO A' };
const B = { codigo: 'B', nombre: 'CURSO B' };

const crearStore = async (jalados: string[]) => {
  const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico('agosto', 7);
  await store.getState().setCursos(await parseUTPExcel(new File(
    [readFileSync(fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url)))], 'Plan_de_Estudio_1.xlsx')));
  for (const codigo of jalados) await store.getState().marcarComoJalado(codigo);
  return store;
};

/** Render de servidor: zustand lee getInitialState(), así que se siembra el estado allí. */
const sembrar = (estado: object) => {
  Object.assign(useAcademicStore.getInitialState(), estado);
  useAcademicStore.setState(estado);
};

const renderFila = async (jalados: string[]) => {
  const store = await crearStore(jalados);
  sembrar(store.getState());
  const servicio = new FinancialPlanningService(new UniversityFinancialRulesProvider());
  return renderToStaticMarkup(<FinancialPlanningContext.Provider value={servicio}>
    <CicloRow numCiclo={8} cursos={[]} periodoActualOrden={crearPeriodoRegular(7).orden} />
  </FinancialPlanningContext.Provider>).replace(/<!-- -->/g, '');
};

describe('pluralizar', () => {
  it('elige singular solo con 1', () => {
    expect(pluralizar(1, 'curso', 'cursos')).toBe('curso');
    expect(pluralizar(0, 'curso', 'cursos')).toBe('cursos');
    expect(pluralizar(2, 'curso', 'cursos')).toBe('cursos');
  });

  it('los créditos concuerdan con jalado/jalados', () => {
    expect(textoCreditos(1, 'jalado', 'jalados')).toBe('1 cr jalado');
    expect(textoCreditos(4, 'jalado', 'jalados')).toBe('4 cr jalados');
    expect(textoCreditos(1, 'llevado', 'llevados')).toBe('1 cr llevado');
  });
});

describe('Textos de jalados con 1 y con 2', () => {
  it('propuesta del planificador', () => {
    expect(explicarPlan({ tipo: 'JALADOS_PRIMERO', total: 1, periodos: ['Verano 7'] }))
      .toMatch(/^Primero se colocó tu curso jalado en el Verano 7/);
    expect(explicarPlan({ tipo: 'JALADOS_PRIMERO', total: 2, periodos: ['Verano 7'] }))
      .toMatch(/^Primero se colocaron tus 2 cursos jalados en el Verano 7/);
    expect(explicarPlan({ tipo: 'RESUMEN', total: 1, cicloInicio: 8, cicloFinal: 10, jaladosEnVerano: 1 }))
      .toBe('Se organizó 1 curso pendiente desde el ciclo 8 hasta el 10, utilizando solo ciclos regulares (el verano se usa únicamente para tu curso jalado).');
    expect(explicarPlan({ tipo: 'RESUMEN', total: 12, cicloInicio: 8, cicloFinal: 10, jaladosEnVerano: 2 }))
      .toContain('Se organizaron 12 cursos pendientes desde el ciclo 8 hasta el 10, utilizando solo ciclos regulares (el verano se usa únicamente para tus 2 cursos jalados).');
  });

  it('toast al marcar como jalado', () => {
    expect(notificacionJalado(A, [B], 'en el Ciclo 8').mensaje)
      .toBe('quedó como jalado. Deberás llevarlo en el Ciclo 8. Este curso planificado ya no cumple sus prerrequisitos:');
    expect(notificacionJalado(A, [A, B], 'en el Ciclo 8').mensaje)
      .toBe('quedó como jalado. Deberás llevarlo en el Ciclo 8. Estos 2 cursos planificados ya no cumplen sus prerrequisitos:');
  });

  it('toast al devolver el jalado a su ciclo', () => {
    expect(notificacionJaladoRetirado('X', [A], 'en el Ciclo 8')?.mensaje).toContain('Este curso queda marcado');
    expect(notificacionJaladoRetirado('X', [A, B], 'en el Ciclo 8')?.mensaje).toContain('Estos 2 cursos quedan marcados');
  });

  it('rechazo y banner con 1 y con 2 jalados', async () => {
    const uno = await crearStore([S61T]);
    expect(await uno.getState().moverCursoAPeriodo('100000H01C', crearPeriodoRegular(8))).toBe(false);
    expect(uno.getState().notificacionMovimiento?.mensaje)
      .toBe('Debes llevar primero HERRAMIENTAS DE DESARROLLO en el Verano 7 o en el Ciclo 8.');

    const dos = await crearStore([S61T, I45N]);
    expect(await dos.getState().moverCursoAPeriodo('100000H01C', crearPeriodoRegular(8))).toBe(false);
    expect(dos.getState().notificacionMovimiento?.mensaje)
      .toBe('Debes llevar primero HERRAMIENTAS DE DESARROLLO y SEGURIDAD INFORMÁTICA en el Verano 7 o en el Ciclo 8.');

    expect(await renderFila([S61T])).toContain('>Agregar jalado a este ciclo<');
    const banner = await renderFila([S61T, I45N]);
    expect(banner).toContain('Debes llevar primero <b>HERRAMIENTAS DE DESARROLLO y SEGURIDAD INFORMÁTICA</b> en el Verano 7 o en el Ciclo 8.');
    expect(banner).toContain('>Agregar jalados a este ciclo<');
  });

  it('título del toast de jalado obligatorio', () => {
    const toast = (faltantes: typeof A[]) => {
      sembrar({ notificacionMovimiento: { tipo: 'JALADO_OBLIGATORIO', cursoNombre: 'X', faltantes, mensaje: 'm' } });
      return renderToStaticMarkup(<PrerequisitoToast />);
    };
    expect(toast([A])).toContain('Curso jalado obligatorio');
    expect(toast([A, B])).toContain('Cursos jalados obligatorios');
  });
});
