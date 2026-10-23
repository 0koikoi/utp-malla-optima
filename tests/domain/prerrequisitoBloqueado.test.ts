import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { moveCourseUseCase } from '../../src/application/usecases/moveCourseUseCase';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import { validarPrerequisitosParaPeriodo } from '../../src/domain/services/prerequisiteService';

const curso = (codigo: string, cambios: Partial<Curso> = {}): Curso => ({
  codigo, nombre: codigo, ciclo: 8, cicloOrigen: 8, tipoPeriodo: 'REGULAR', ubicacion: 'banco',
  horasSemanales: 4, creditos: 4, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE', ...cambios,
});

describe('Bug #3 - un prerrequisito en un periodo bloqueado no habilita', () => {
  const cursos = [
    curso('REQ', { ciclo: 7, cicloOrigen: 7, ubicacion: 'periodo' }),
    curso('OBJ', { prerrequisitos: ['REQ'] }),
    curso('ACT', { ciclo: 7, cicloOrigen: 7, ubicacion: 'periodo', estado: 'EN_CURSO' }),
  ];

  it('un PENDIENTE en el Ciclo 7 (bloqueado) no habilita un curso en el Ciclo 8', () => {
    const resultado = validarPrerequisitosParaPeriodo(cursos[1], cursos, crearPeriodoRegular(8), { cicloActual: 7 });
    expect(resultado).toEqual({ valido: false, faltantes: [{ codigo: 'REQ', nombre: 'REQ' }] });
  });

  it('moveCourseUseCase rechaza el movimiento al Ciclo 8', () => {
    const resultado = moveCourseUseCase(cursos, 'OBJ', crearPeriodoRegular(8), { cicloActual: 7 });
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.reason).toBe('PREREQUISITES');
  });

  it('sin ciclo actual explícito se deriva de los cursos EN_CURSO', () => {
    expect(validarPrerequisitosParaPeriodo(cursos[1], cursos, crearPeriodoRegular(8)).valido).toBe(false);
  });
});
