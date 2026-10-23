import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';

const curso = (codigo: string, ciclo: number, tipoPeriodo: Curso['tipoPeriodo'] = 'REGULAR'): Curso => ({
  codigo, nombre: codigo, ciclo, cicloOrigen: ciclo, tipoPeriodo, ubicacion: 'periodo',
  horasSemanales: 4, creditos: 4, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE',
});

const calcular = (cursos: Curso[], cicloActual?: number | null) =>
  new FinancialPlanningService(new UniversityFinancialRulesProvider())
    .calcular(cursos, FinancialConfigurationProvider.load(), 'Ingeniería y Arquitectura', { cicloActual });

describe('Bug #2 - FinancialEngine excluye periodos regulares bloqueados', () => {
  const cursos = [curso('C6', 6), curso('C7', 7), curso('V7', 7, 'VERANO'), curso('C8', 8)];

  it('no cotiza ciclos regulares <= ciclo actual, pero sí el verano del ciclo actual', () => {
    expect(calcular(cursos, 7).periodos.map((periodo) => periodo.id)).toEqual(['verano-7', 'ciclo-8']);
  });

  it('sin ciclo actual conserva el comportamiento anterior', () => {
    expect(calcular(cursos).periodos.map((periodo) => periodo.id)).toEqual(['ciclo-6', 'ciclo-7', 'verano-7', 'ciclo-8']);
  });

  it('el total solo suma los periodos cotizables', () => {
    const resultado = calcular(cursos, 7);
    expect(resultado.totalGeneral).toBe(calcular([curso('V7', 7, 'VERANO'), curso('C8', 8)]).totalGeneral);
  });
});

describe('Bug #2 - caracterización con ciclo actual 7', () => {
  it('el 8vo en ciclo-8 mantiene el total sin descuento de 5055.15', async () => {
    const fixture = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));
    const octavo = ['100000S06I', '100000S72T', '100000S73T', '100000H01C', '100000TD09', '100000I62N', '100000S71T'];
    const cursos = (await parseUTPExcel(new File([readFileSync(fixture)], 'Plan_de_Estudio_1.xlsx')))
      .map((item) => octavo.includes(item.codigo) ? { ...item, ciclo: 8, ubicacion: 'periodo' as const } : item);
    expect(calcular(cursos, 7).totalGeneral).toBe(5055.15);
  });
});
