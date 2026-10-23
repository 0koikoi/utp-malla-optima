import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Curso } from '../../src/types/academic';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { crearPeriodoRegular } from '../../src/domain/rules/academicPeriodRules';
import {
  isCursoDesbloqueado,
  validarPrerequisitosParaPeriodo,
} from '../../src/domain/services/prerequisiteService';
import { FinancialConfigurationProvider } from '../../src/infrastructure/configuration/FinancialConfigurationProvider';
import { UniversityFinancialRulesProvider } from '../../src/financial/rules/UniversityFinancialRulesProvider';
import { FinancialPlanningService } from '../../src/financial/services/FinancialPlanningService';

/**
 * Pruebas de caracterización: congelan el comportamiento ACTUAL de MallaU con
 * un Excel real de UTP (Plan_de_Estudio_1.xlsx, alumno en ciclo 7).
 * Si alguna falla tras un cambio, revisar si el cambio de comportamiento es intencional.
 */

const FIXTURE = fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url));
const DISCIPLINA = 'Ingeniería y Arquitectura';
const CURSOS_OCTAVO = [
  '100000S06I', '100000S72T', '100000S73T', '100000H01C',
  '100000TD09', '100000I62N', '100000S71T',
];

const cargarFixture = (): File =>
  new File([readFileSync(FIXTURE)], 'Plan_de_Estudio_1.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

/** Ubica los 7 cursos del 8vo ciclo en el periodo regular ciclo-8, como al arrastrarlos. */
const planificarOctavo = (cursos: Curso[]): Curso[] =>
  cursos.map((curso) => CURSOS_OCTAVO.includes(curso.codigo)
    ? { ...curso, ciclo: 8, tipoPeriodo: 'REGULAR' as const, ubicacion: 'periodo' as const }
    : curso);

const buscar = (cursos: Curso[], codigo: string): Curso => {
  const curso = cursos.find((item) => item.codigo === codigo);
  if (!curso) throw new Error(`No existe el curso ${codigo} en el fixture.`);
  return curso;
};

let cursos: Curso[];

beforeAll(async () => {
  cursos = await parseUTPExcel(cargarFixture());
});

describe('Caracterización - parseUTPExcel con Plan_de_Estudio_1.xlsx', () => {
  it('importa 72 cursos y descarta los de Nivelación', () => {
    expect(cursos).toHaveLength(72);
    expect(cursos.filter((curso) => curso.codigo.startsWith('100000X'))).toHaveLength(0);
  });

  it('normaliza "EN CURSO" como EN_CURSO', () => {
    expect(cursos.filter((curso) => curso.estado === 'EN_CURSO')).toHaveLength(7);
  });

  it('normaliza el Tipo E como ELECTIVO', () => {
    const electivos = cursos.filter((curso) => curso.tipo === 'ELECTIVO').map((curso) => curso.codigo);
    expect(electivos.sort()).toEqual(['100000CN47', '100000I64M', '100000RI07', '100000ZZ28']);
  });

  it('conserva los decimales de los laboratorios', () => {
    const laboratorio = buscar(cursos, '100000F1I2');
    expect(laboratorio.horasSemanales).toBe(0.44);
    expect(laboratorio.creditos).toBe(0.22);
  });

  it('suma 121 créditos aprobados + convalidados (sin Nivelación)', () => {
    const creditos = cursos
      .filter((curso) => curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO')
      .reduce((suma, curso) => suma + curso.creditos, 0);
    expect(creditos).toBeCloseTo(121, 10);
  });
});

describe('Caracterización - 8vo ciclo planificado en ciclo-8', () => {
  const calcular = (opciones = {}) => {
    const service = new FinancialPlanningService(new UniversityFinancialRulesProvider());
    return service.calcular(planificarOctavo(cursos), FinancialConfigurationProvider.load(), DISCIPLINA, opciones);
  };

  it('genera un único periodo ciclo-8 con 21 cr, 25 h, cuota 931.43 y 3 horas extra', () => {
    const resultado = calcular();
    expect(resultado.periodos.map((periodo) => periodo.id)).toEqual(['ciclo-8']);

    const resumen = resultado.periodos[0].resumen;
    expect(resumen.totalCreditos).toBe(21);
    expect(resumen.totalHorasSemanales).toBe(25);
    expect(resumen.cuotaBase).toBe(931.43);
    expect(resumen.horasExceso).toBe(3);
  });

  it.each([
    ['sin descuento', { metodoPago: 'sin_descuento' }, 5055.15],
    ['Interbank / Scotiabank', { metodoPago: 'interbank_scotiabank' }, 4822.3],
    ['BCP / BBVA', { metodoPago: 'bcp_bbva' }, 4938.7],
    ['pago único', { metodoPago: 'sin_descuento', pagoUnicoPorPeriodo: { 'ciclo-8': true } }, 4705.86],
  ])('FinancialPlanningService: total %s = %d', (_nombre, opciones, total) => {
    expect(calcular(opciones).totalGeneral).toBe(total);
  });

  it('validarPrerequisitosParaPeriodo acepta los 7 cursos en ciclo-8 con prerrequisitos EN_CURSO', () => {
    const planificados = planificarOctavo(cursos);
    for (const codigo of CURSOS_OCTAVO) {
      const resultado = validarPrerequisitosParaPeriodo(buscar(planificados, codigo), planificados, crearPeriodoRegular(8));
      expect(resultado, codigo).toEqual({ valido: true, faltantes: [] });
    }
  });

  it('isCursoDesbloqueado desbloquea S73T e I62N (prerrequisito EN_CURSO)', () => {
    // BUG #5 corregido: un prerrequisito EN_CURSO desbloquea el curso para el próximo
    // periodo planificable, con la misma regla que validarPrerequisitosParaPeriodo.
    expect(isCursoDesbloqueado(buscar(cursos, '100000S73T'), cursos)).toBe(true);
    expect(isCursoDesbloqueado(buscar(cursos, '100000I62N'), cursos)).toBe(true);
  });
});
