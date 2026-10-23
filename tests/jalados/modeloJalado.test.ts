import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { moveCourseUseCase } from '../../src/application/usecases/moveCourseUseCase';
import { crearPeriodoRegular, crearPeriodoVerano } from '../../src/domain/rules/academicPeriodRules';
import { esJaladoSinReplanificar, normalizarCurso } from '../../src/domain/rules/courseRules';
import { generarPlanificacionAutomatica } from '../../src/domain/services/automaticPlanningService';
import { prerrequisitoCumplido } from '../../src/domain/services/prerequisiteService';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';

const curso = (codigo: string, cambios: Partial<Curso> = {}): Curso => ({
  codigo, nombre: codigo, ciclo: 8, cicloOrigen: 8, tipoPeriodo: 'REGULAR', ubicacion: 'banco',
  horasSemanales: 4, creditos: 4, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE', ...cambios,
});

const JALADO = curso('J', { ciclo: 6, cicloOrigen: 6, ubicacion: 'periodo', jalado: true });
const PENDIENTE_EN_6 = curso('P', { ciclo: 6, cicloOrigen: 6, ubicacion: 'periodo' });
const CONTEXTO = { cicloActual: 7 };

describe('Modelo de curso jalado', () => {
  it('sigue sin replanificar mientras esté en un periodo bloqueado', () => {
    expect(esJaladoSinReplanificar(JALADO, 7)).toBe(true);
    expect(esJaladoSinReplanificar({ ...JALADO, ciclo: 8 }, 7)).toBe(false);
    expect(esJaladoSinReplanificar({ ...JALADO, ciclo: 7, tipoPeriodo: 'VERANO' }, 7)).toBe(false);
    expect(esJaladoSinReplanificar(PENDIENTE_EN_6, 7)).toBe(false);
  });

  it('un PENDIENTE normal no se trata como jalado', () => {
    expect(PENDIENTE_EN_6.jalado).toBeUndefined();
    expect(normalizarCurso({ ...curso('N'), ubicacion: undefined as unknown as Curso['ubicacion'] }).ubicacion).toBe('banco');
    expect(normalizarCurso({ ...JALADO, ubicacion: undefined as unknown as Curso['ubicacion'] }).ubicacion).toBe('periodo');
  });

  it('en su ciclo original nunca cumple como prerrequisito; replanificado sí', () => {
    expect(prerrequisitoCumplido('J', [JALADO], crearPeriodoRegular(9), CONTEXTO)).toBe(false);
    expect(prerrequisitoCumplido('J', [JALADO], crearPeriodoRegular(9))).toBe(false);
    expect(prerrequisitoCumplido('J', [{ ...JALADO, ciclo: 8 }], crearPeriodoRegular(9), CONTEXTO)).toBe(true);
  });

  it('no se cotiza en su ciclo original y sí al replanificarlo', () => {
    const service = new FinancialPlanningService(new UniversityFinancialRulesProvider());
    const tarifario = FinancialConfigurationProvider.load();
    const calcular = (cursos: Curso[], cicloActual?: number) => service
      .calcular(cursos, tarifario, 'Ingeniería y Arquitectura', { cicloActual }).periodos.map((periodo) => periodo.id);
    expect(calcular([JALADO])).toEqual([]);
    expect(calcular([JALADO], 7)).toEqual([]);
    expect(calcular([{ ...JALADO, ciclo: 8 }], 7)).toEqual(['ciclo-8']);
  });

  it('se puede mover desde su ciclo bloqueado a un periodo futuro, pero no a uno bloqueado', () => {
    const cursos = [JALADO, PENDIENTE_EN_6];
    expect(moveCourseUseCase(cursos, 'J', crearPeriodoRegular(8), CONTEXTO).ok).toBe(true);
    expect(moveCourseUseCase(cursos, 'J', crearPeriodoVerano(8), { ...CONTEXTO, periodoIngreso: 'marzo' }).ok).toBe(true);
    expect(moveCourseUseCase(cursos, 'J', crearPeriodoRegular(7), CONTEXTO).ok).toBe(false);
    const pendiente = moveCourseUseCase(cursos, 'P', crearPeriodoRegular(8), CONTEXTO);
    expect(!pendiente.ok && pendiente.reason).toBe('SOURCE_PERIOD_LOCKED');
  });

  it('el planificador automático lo replanifica en lugar de conservarlo en su ciclo original', () => {
    const dependiente = curso('D', { prerrequisitos: ['J'] });
    const resultado = generarPlanificacionAutomatica([JALADO, dependiente], { cicloActual: 7, totalCiclos: 10 });
    const porCodigo = new Map(resultado.cursos.map((item) => [item.codigo, item]));
    expect(porCodigo.get('J')).toMatchObject({ ciclo: 8, ubicacion: 'periodo', jalado: true });
    expect(porCodigo.get('D')).toMatchObject({ ciclo: 9, ubicacion: 'periodo' });
  });
});
