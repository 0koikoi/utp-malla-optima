import type { CursoEnPlanificador, Tarifario } from '@/core/types';
import type { FinancialPeriod, FinancialSummary } from '../models/FinancialPeriod';
import type { UniversityFinancialRules } from '../rules/UniversityFinancialRules';

export interface FinancialEngineOptions {
  metodoPago?: string;
  pagoUnicoPorPeriodo?: Record<string, boolean>;
}

export class FinancialEngine {
  private readonly rules: UniversityFinancialRules;

  constructor(rules: UniversityFinancialRules) {
    this.rules = rules;
  }

  calcular(
    cursos: CursoEnPlanificador[],
    tarifario: Tarifario,
    disciplina: string,
    opciones: FinancialEngineOptions = {}
  ): FinancialSummary {
    const agrupados = new Map<string, CursoEnPlanificador[]>();

    cursos
      .filter((curso) => curso.ubicacion === 'periodo' && curso.estado === 'PENDIENTE')
      .forEach((curso) => {
        const key =
          curso.tipoPeriodo === 'VERANO'
            ? `verano-${curso.ciclo}`
            : `ciclo-${curso.ciclo}`;

        agrupados.set(key, [...(agrupados.get(key) ?? []), curso]);
      });

    const periodos: FinancialPeriod[] = [...agrupados.entries()]
      .sort((a, b) => {
        const primerA = a[1][0];
        const primerB = b[1][0];
        const ao = primerA ? primerA.ciclo * 2 + (primerA.tipoPeriodo === 'VERANO' ? 1 : 0) : 0;
        const bo = primerB ? primerB.ciclo * 2 + (primerB.tipoPeriodo === 'VERANO' ? 1 : 0) : 0;
        return ao - bo;
      })
      .map(([id, cursosPeriodo]) => {
        const primero = cursosPeriodo[0];
        const esVerano = primero?.tipoPeriodo === 'VERANO';
        const cicloNum = primero?.ciclo ?? 1;

        return {
          id,
          etiqueta: esVerano ? `VERANO ${cicloNum}` : `CICLO ${cicloNum}`,
          cursos: cursosPeriodo,
          resumen: this.rules.calcular(cursosPeriodo, tarifario, disciplina, {
            metodoPago: opciones.metodoPago,
            pagoUnico: !esVerano ? Boolean(opciones.pagoUnicoPorPeriodo?.[id]) : false,
          }),
        };
      });

    return {
      periodos,
      totalGeneral: periodos.reduce(
        (suma, periodo) => suma + periodo.resumen.costoTotalCiclo,
        0
      ),
    };
  }
}
