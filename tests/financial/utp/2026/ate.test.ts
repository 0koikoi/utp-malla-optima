import { describe, expect, it } from 'vitest';
import type { Curso } from '../../../../src/types/academic';
import { FinancialConfigurationProvider } from '../../../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { UtpFinancialConfigProvider } from '../../../../src/infrastructure/configuration/utp/UtpFinancialConfigProvider';
import { FinancialPlanningService } from '../../../../src/financial/services/FinancialPlanningService';

const crearCurso = (
  codigo: string,
  horasSemanales: number,
  tipoPeriodo: Curso['tipoPeriodo'] = 'REGULAR'
): Curso => ({
  codigo,
  nombre: codigo,
  ciclo: 1,
  cicloOrigen: 1,
  tipoPeriodo,
  ubicacion: 'periodo',
  horasSemanales,
  creditos: 4,
  tipo: 'OBLIGATORIO',
  prerrequisitos: [],
  estado: 'PENDIENTE',
});

describe('UTP Ate - tarifario 2026', () => {
  it('mantiene registrada de forma explícita la combinación sede/año', () => {
    expect(
      UtpFinancialConfigProvider.isRegistered({
        sedeId: 'ate',
        tarifarioVersion: '2026',
      })
    ).toBe(true);

    expect(
      UtpFinancialConfigProvider.isRegistered({
        sedeId: 'ate',
        tarifarioVersion: '2027',
      })
    ).toBe(false);

    expect(
      UtpFinancialConfigProvider.isRegistered({
        sedeId: 'chiclayo',
        tarifarioVersion: '2026',
      })
    ).toBe(false);
  });

  it('conserva el cálculo regular conocido para 16 horas', () => {
    const tarifario = FinancialConfigurationProvider.load();
    const cursos = [
      crearCurso('REG-1', 4),
      crearCurso('REG-2', 4),
      crearCurso('REG-3', 4),
      crearCurso('REG-4', 4),
    ];

    const result = FinancialPlanningService.calcular(
      cursos,
      tarifario,
      'Ingeniería y Arquitectura'
    );

    expect(tarifario.reglasFinancierasId).toBe('utp');
    expect(tarifario.tarifarioVersion).toBe('2026');
    expect(tarifario.sedeId).toBe('ate');
    expect(result.periodos).toHaveLength(1);
    expect(result.periodos[0].resumen.cuotaBase).toBe(815);
    expect(result.periodos[0].resumen.numeroCuotas).toBe(5);
    expect(result.periodos[0].resumen.costoMatricula).toBe(398);
    expect(result.periodos[0].resumen.costoTotalCiclo).toBe(4473);
  });

  it('conserva las reglas de verano para un curso de 4 horas', () => {
    const tarifario = FinancialConfigurationProvider.load();
    const curso = crearCurso('VER-1', 4, 'VERANO');

    const result = FinancialPlanningService.calcular(
      [curso],
      tarifario,
      'Ingeniería y Arquitectura',
      { metodoPago: 'interbank_scotiabank' }
    );

    expect(result.periodos).toHaveLength(1);
    expect(result.periodos[0].resumen.horasTarifarias).toBe(8);
    expect(result.periodos[0].resumen.cuotaBase).toBe(570.5);
    expect(result.periodos[0].resumen.numeroCuotas).toBe(2);
    expect(result.periodos[0].resumen.costoMatricula).toBe(198);
    expect(result.periodos[0].resumen.descuentoPorcentaje).toBe(0);
  });
});
