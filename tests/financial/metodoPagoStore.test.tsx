import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { PlanificadorPanel } from '../../src/components/PlanificadorPanel';
import { FinancialPlanningContext } from '../../src/financial/FinancialPlanningContext';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { useAcademicStore } from '../../src/store/useAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));
const CURSOS_OCTAVO = ['100000S06I', '100000S72T', '100000S73T', '100000H01C', '100000TD09', '100000I62N', '100000S71T'];
const service = new FinancialPlanningService(new UniversityFinancialRulesProvider());

let cursos: Curso[];
beforeAll(async () => {
  cursos = (await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx')))
    .map((curso) => CURSOS_OCTAVO.includes(curso.codigo)
      ? { ...curso, ciclo: 8, tipoPeriodo: 'REGULAR' as const, ubicacion: 'periodo' as const } : curso);
});

const CASOS: [string, string, boolean, number][] = [
  ['sin descuento', 'sin_descuento', false, 5055.15],
  ['Interbank / Scotiabank', 'interbank_scotiabank', false, 4822.3],
  ['BCP / BBVA', 'bcp_bbva', false, 4938.7],
  ['pago único', 'sin_descuento', true, 4705.86],
];

describe('F3 - método de pago en financialSlice', () => {
  it('arranca sin descuento y sin pagos únicos', () => {
    const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
    expect(store.getState().metodoPago).toBe('sin_descuento');
    expect(store.getState().pagoUnicoPorPeriodo).toEqual({});
  });

  it.each(CASOS)('con los setters del store, total %s = %d', (_nombre, metodo, pagoUnico, total) => {
    const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
    store.getState().setMetodoPago(metodo);
    if (pagoUnico) store.getState().setPagoUnico('ciclo-8', true);
    const { metodoPago, pagoUnicoPorPeriodo } = store.getState();
    const resultado = service.calcular(cursos, FinancialConfigurationProvider.load(), 'Ingeniería y Arquitectura',
      { metodoPago, pagoUnicoPorPeriodo, cicloActual: 7 });
    expect(resultado.totalGeneral).toBe(total);
  });

  it('setPagoUnico se puede desactivar', () => {
    const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
    store.getState().setPagoUnico('ciclo-8', true);
    store.getState().setPagoUnico('ciclo-8', false);
    expect(store.getState().pagoUnicoPorPeriodo).toEqual({ 'ciclo-8': false });
  });

  it.each(CASOS)('PlanificadorPanel lee el método del store: %s = %d', (_nombre, metodo, pagoUnico, total) => {
    // En render de servidor zustand lee getInitialState(), así que se siembra también ahí.
    const estado = {
      cursos, tarifario: FinancialConfigurationProvider.load(), disciplinaActiva: 'Ingeniería y Arquitectura',
      cicloActual: 7, panelPlanificadorAbierto: true,
      metodoPago: metodo, pagoUnicoPorPeriodo: pagoUnico ? { 'ciclo-8': true } : {},
    };
    Object.assign(useAcademicStore.getInitialState(), estado);
    useAcademicStore.setState(estado);
    const html = renderToStaticMarkup(
      <FinancialPlanningContext.Provider value={service}><PlanificadorPanel /></FinancialPlanningContext.Provider>
    );
    expect(html).toContain(`Inversión estimada: <b>S/ ${total.toFixed(2)}</b>`);
  });
});
