import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import { validarPrerequisitosParaPeriodo } from '../../src/domain/services/prerequisiteService';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_desaprobado.xlsx', import.meta.url));
const I60N = '100000I60N';
const DEPENDIENTES = ['100000S06I', '100000S72T', '100000TD09'];

const crearStore = async () => {
  const { repos } = crearRepositoriosEnMemoria();
  const store = createAcademicStore(repos);
  await store.getState().setTarifario(FinancialConfigurationProvider.load());
  await store.getState().setContextoAcademico('marzo', 7);
  await store.getState().setCursos(await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_desaprobado.xlsx')));
  return store;
};

describe('Plan_de_Estudio_desaprobado.xlsx - I60N jalado', () => {
  let store: Awaited<ReturnType<typeof crearStore>>;
  beforeEach(async () => { store = await crearStore(); });

  const curso = (codigo: string) => store.getState().cursos.find((item) => item.codigo === codigo)!;
  const validoEn = (codigo: string, ciclo: number) => {
    const state = store.getState();
    return validarPrerequisitosParaPeriodo(curso(codigo), state.cursos, crearPeriodoRegular(ciclo), state).valido;
  };

  it('se importa como jalado en el Ciclo 6', () => {
    expect(curso(I60N)).toMatchObject({ estado: 'PENDIENTE', jalado: true, ciclo: 6, tipoPeriodo: 'REGULAR', ubicacion: 'periodo' });
  });

  it('en el Ciclo 6 no se cotiza', () => {
    const { cursos, tarifario, disciplinaActiva, cicloActual } = store.getState();
    const resultado = new FinancialPlanningService(new UniversityFinancialRulesProvider())
      .calcular(cursos, tarifario!, disciplinaActiva, { cicloActual });
    expect(resultado.periodos).toEqual([]);
  });

  it('mientras siga en el Ciclo 6, S06I, S72T y TD09 no son válidos en ciclo-8', async () => {
    for (const codigo of DEPENDIENTES) {
      expect(validoEn(codigo, 8), codigo).toBe(false);
      expect(await store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(8)), codigo).toBe(false);
      // Regla UTP: antes que el prerrequisito, falta llevar el jalado en ciclo-8.
      expect(store.getState().notificacionMovimiento?.tipo).toBe('JALADO_OBLIGATORIO');
    }
  });

  it('se puede mover a ciclo-8; entonces sus dependientes solo son válidos en ciclo-9 o después', async () => {
    expect(await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(8))).toBe(true);
    expect(curso(I60N)).toMatchObject({ ciclo: 8, ubicacion: 'periodo', jalado: true });
    for (const codigo of DEPENDIENTES) {
      expect(validoEn(codigo, 8), `${codigo} en ciclo-8`).toBe(false);
      expect(validoEn(codigo, 9), `${codigo} en ciclo-9`).toBe(true);
      expect(validoEn(codigo, 10), `${codigo} en ciclo-10`).toBe(true);
      expect(await store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(8)), codigo).toBe(false);
      expect(await store.getState().moverCursoAPeriodo(codigo, crearPeriodoRegular(9)), codigo).toBe(true);
    }
  });

  it('no se puede devolver a un ciclo bloqueado', async () => {
    expect(await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(7))).toBe(false);
  });

  it('replanificado en ciclo-8 se cotiza ahí', async () => {
    await store.getState().moverCursoAPeriodo(I60N, crearPeriodoRegular(8));
    const { cursos, tarifario, disciplinaActiva, cicloActual } = store.getState();
    const resultado = new FinancialPlanningService(new UniversityFinancialRulesProvider())
      .calcular(cursos, tarifario!, disciplinaActiva, { cicloActual });
    expect(resultado.periodos.map((periodo) => periodo.id)).toEqual(['ciclo-8']);
    expect(resultado.periodos[0].cursos.map((item) => item.codigo)).toEqual([I60N]);
  });
});
