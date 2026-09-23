import type { Curso, Tarifario } from '../../types/academic';
import type { FinancialPeriod, FinancialSummary } from '../models/FinancialPeriod';
import type { UniversityFinancialRules } from '../rules/UniversityFinancialRules';

interface FinancialEngineOptions {
  metodoPago?: string;
  pagoUnicoPorPeriodo?: Record<string, boolean>;
}

export class FinancialEngine {
  private readonly rules: UniversityFinancialRules;

  constructor(rules: UniversityFinancialRules) {
    this.rules = rules;
  }

  calcular(
    cursos: Curso[],
    tarifario: Tarifario,
    disciplina: string,
    opciones: FinancialEngineOptions = {}
  ): FinancialSummary {
    const agrupados = new Map<string, Curso[]>();

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
        const ao = a[1][0].ciclo * 2 + (a[1][0].tipoPeriodo === 'VERANO' ? 1 : 0);
        const bo = b[1][0].ciclo * 2 + (b[1][0].tipoPeriodo === 'VERANO' ? 1 : 0);
        return ao - bo;
      })
      .map(([id, cursosPeriodo]) => ({
        id,
        etiqueta:
          cursosPeriodo[0].tipoPeriodo === 'VERANO'
            ? `VERANO ${cursosPeriodo[0].ciclo}`
            : `CICLO ${cursosPeriodo[0].ciclo}`,
        cursos: cursosPeriodo,
        resumen: this.rules.calcular(cursosPeriodo, tarifario, disciplina, {
          metodoPago: opciones.metodoPago,
          pagoUnico:
            cursosPeriodo[0].tipoPeriodo === 'REGULAR'
              ? Boolean(opciones.pagoUnicoPorPeriodo?.[id])
              : false,
        }),
      }));

    return {
      periodos,
      totalGeneral: periodos.reduce(
        (suma, periodo) => suma + periodo.resumen.costoTotalCiclo,
        0
      ),
    };
  }
}
