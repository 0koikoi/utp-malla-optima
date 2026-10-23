import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { moveCourseUseCase } from '../../src/application/usecases/moveCourseUseCase';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import {
  obtenerHorasSinRecargo,
  validarLimiteHorasPeriodo,
  validarRecargoHorasPeriodo,
} from '../../src/domain/rules/planningRules';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { notificacionDesdeResultado } from '../../src/presentation/messages/movementMessages';

const DISCIPLINA = 'Ingeniería y Arquitectura';

const crearCurso = (codigo: string, horasSemanales: number, ubicacion: Curso['ubicacion'] = 'periodo'): Curso => ({
  codigo, nombre: codigo, ciclo: 8, cicloOrigen: 8, tipoPeriodo: 'REGULAR', ubicacion,
  horasSemanales, creditos: 3, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE',
});

/** Un periodo con `horasPrevias` ya planificadas y un curso de 1 h por mover. */
const moverConCarga = (horasPrevias: number) => {
  const tarifario = FinancialConfigurationProvider.load();
  const cursos = [crearCurso('BASE', horasPrevias), crearCurso('NUEVO', 1, 'banco')];
  const resultado = moveCourseUseCase(cursos, 'NUEVO', crearPeriodoRegular(8), {
    cicloActual: 7, horasSinRecargo: obtenerHorasSinRecargo(tarifario, DISCIPLINA),
  });
  return { resultado, aviso: notificacionDesdeResultado(cursos[1], crearPeriodoRegular(8), resultado) };
};

describe('Bug #4 - aviso de recargo por horas', () => {
  it('lee el umbral del último rango de pensión del tarifario activo', () => {
    const tarifario = FinancialConfigurationProvider.load();
    const rangos = tarifario.disciplinas[DISCIPLINA].rangosPension ?? [];
    expect(obtenerHorasSinRecargo(tarifario, DISCIPLINA)).toBe(Math.max(...rangos.map((rango) => rango.maxHoras)));
    expect(obtenerHorasSinRecargo(tarifario, DISCIPLINA)).toBe(22);
    expect(obtenerHorasSinRecargo(null, DISCIPLINA)).toBeNull();
  });

  it.each([
    [22, false, false],
    [23, true, false],
    [25, true, true],
  ])('%d h: recargo=%s, más de 24 h=%s', (horas, recargo, exceso24) => {
    const cursos = [crearCurso('A', horas)];
    const umbral = obtenerHorasSinRecargo(FinancialConfigurationProvider.load(), DISCIPLINA);
    expect(validarRecargoHorasPeriodo(cursos, 'REGULAR', umbral)?.valido).toBe(!recargo);
    expect(validarLimiteHorasPeriodo(cursos, 'REGULAR').valido).toBe(!exceso24);
  });

  it('el movimiento a 22 h no genera aviso', () => {
    const { resultado, aviso } = moverConCarga(21);
    expect(resultado.ok && resultado.surcharge).toBeNull();
    expect(aviso).toBeNull();
  });

  it('el movimiento a 23 h avisa solo del recargo', () => {
    const { resultado, aviso } = moverConCarga(22);
    expect(resultado.ok && resultado.warning).toBeNull();
    expect(aviso?.mensaje).toContain('Desde 23 h pagas recargo por hora adicional');
    expect(aviso?.mensaje).not.toContain('recomendadas');
  });

  it('el movimiento a 25 h muestra ambos avisos', () => {
    const { aviso } = moverConCarga(24);
    expect(aviso?.mensaje).toContain('supera las 24 horas recomendadas');
    expect(aviso?.mensaje).toContain('Desde 23 h pagas recargo por hora adicional');
  });
});
