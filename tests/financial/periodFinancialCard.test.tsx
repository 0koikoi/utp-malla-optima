import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { PeriodFinancialCard } from '../../src/financial/components/PeriodFinancialCard';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));
const CURSOS_OCTAVO = ['100000S06I', '100000S72T', '100000S73T', '100000H01C', '100000TD09', '100000I62N', '100000S71T'];

let cursos: Curso[];
beforeAll(async () => {
  cursos = (await parseUTPExcel(new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx')))
    .map((curso) => CURSOS_OCTAVO.includes(curso.codigo)
      ? { ...curso, ciclo: 8, tipoPeriodo: 'REGULAR' as const, ubicacion: 'periodo' as const } : curso);
});

const renderizar = (metodoPago: string) => {
  const service = new FinancialPlanningService(new UniversityFinancialRulesProvider());
  const resultado = service.calcular(cursos, FinancialConfigurationProvider.load(), 'Ingeniería y Arquitectura', { metodoPago });
  return { resultado, html: renderToStaticMarkup(<PeriodFinancialCard periodo={resultado.periodos[0]} />) };
};

describe('Bug #6 - PeriodFinancialCard separa pensión base y cuota con descuento', () => {
  it('con pronto pago muestra la pensión base sin descuento y la cuota con descuento', () => {
    const { resultado, html } = renderizar('interbank_scotiabank');
    expect(html).toContain('Pensión base:</span> S/ 931.43');
    expect(html).toContain(`Cuota con descuento:</span> S/ ${resultado.periodos[0].resumen.montoPorCuota.toFixed(2)}`);
    expect(resultado.totalGeneral).toBe(4822.3);
  });

  it('muestra las horas adicionales y su costo por cuota', () => {
    const { html } = renderizar('sin_descuento');
    expect(html).toContain('3 h · +S/ 116.43/cuota');
  });

  it('sin descuento no muestra la línea de cuota con descuento', () => {
    const { html } = renderizar('sin_descuento');
    expect(html).not.toContain('Cuota con descuento');
  });
});
