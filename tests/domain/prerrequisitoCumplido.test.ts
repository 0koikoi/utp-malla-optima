import { describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { crearPeriodoRegular, crearPeriodoVerano } from '../../src/domain/rules/academicPeriodRules';
import {
  isCursoDesbloqueado,
  prerrequisitoCumplido,
  validarPrerequisitosParaPeriodo,
} from '../../src/domain/services/prerequisiteService';

const curso = (codigo: string, cambios: Partial<Curso> = {}): Curso => ({
  codigo, nombre: codigo, ciclo: 8, cicloOrigen: 8, tipoPeriodo: 'REGULAR', ubicacion: 'banco',
  horasSemanales: 4, creditos: 4, tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE', ...cambios,
});

const CONTEXTO = { cicloActual: 7, periodoIngreso: 'marzo' as const };
const CICLO_8 = crearPeriodoRegular(8);

describe('Bug #5 - prerrequisitoCumplido, regla única', () => {
  it('a) APROBADO y CONVALIDADO cumplen', () => {
    const cursos = [curso('A', { estado: 'APROBADO', ciclo: 3, ubicacion: 'periodo' }),
      curso('C', { estado: 'CONVALIDADO', ciclo: 2, ubicacion: 'periodo' })];
    expect(prerrequisitoCumplido('A', cursos, CICLO_8, CONTEXTO)).toBe(true);
    expect(prerrequisitoCumplido('C', cursos, CICLO_8, CONTEXTO)).toBe(true);
  });

  it('b) EN_CURSO cumple solo en destinos posteriores al ciclo actual', () => {
    const cursos = [curso('E', { estado: 'EN_CURSO', ciclo: 7, ubicacion: 'periodo' })];
    expect(prerrequisitoCumplido('E', cursos, CICLO_8, CONTEXTO)).toBe(true);
    expect(prerrequisitoCumplido('E', cursos, crearPeriodoVerano(7), CONTEXTO)).toBe(true);
    expect(prerrequisitoCumplido('E', cursos, crearPeriodoRegular(7), CONTEXTO)).toBe(false);
  });

  it('c) PENDIENTE cumple si está en un periodo anterior no bloqueado', () => {
    const cursos = [curso('P', { ciclo: 8, ubicacion: 'periodo' }), curso('B')];
    expect(prerrequisitoCumplido('P', cursos, crearPeriodoRegular(9), CONTEXTO)).toBe(true);
    expect(prerrequisitoCumplido('P', cursos, CICLO_8, CONTEXTO)).toBe(false);
    expect(prerrequisitoCumplido('B', cursos, crearPeriodoRegular(9), CONTEXTO)).toBe(false);
  });

  it('d) un código que no existe en la malla cumple (nivelación)', () => {
    expect(prerrequisitoCumplido('100000X104', [curso('A')], CICLO_8, CONTEXTO)).toBe(true);
  });

  it('isCursoDesbloqueado y validarPrerequisitosParaPeriodo coinciden en el próximo periodo planificable', () => {
    const cursos = [
      curso('E', { estado: 'EN_CURSO', ciclo: 7, ubicacion: 'periodo' }),
      curso('P', { ciclo: 8, ubicacion: 'periodo' }),
      curso('X', { prerrequisitos: ['E'] }),
      curso('Y', { prerrequisitos: ['P'] }),
    ];
    for (const codigo of ['X', 'Y']) {
      const objetivo = cursos.find((item) => item.codigo === codigo)!;
      expect(isCursoDesbloqueado(objetivo, cursos, CONTEXTO), codigo)
        .toBe(validarPrerequisitosParaPeriodo(objetivo, cursos, CICLO_8, CONTEXTO).valido);
    }
    expect(isCursoDesbloqueado(cursos[2], cursos, CONTEXTO)).toBe(true);
    expect(isCursoDesbloqueado(cursos[3], cursos, CONTEXTO)).toBe(false);
  });
});
