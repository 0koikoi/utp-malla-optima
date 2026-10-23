import type { Curso, PeriodoAcademico, PeriodoIngreso } from '../../../types/academic';

export interface CursoPlanificadoResumen {
  codigo: string;
  nombre: string;
  creditos: number;
  impacto: number;
}

export interface CicloPlanificadoResumen {
  ciclo: number;
  periodo: PeriodoAcademico;
  creditos: number;
  horasEfectivas: number;
  impacto: number;
  cursos: CursoPlanificadoResumen[];
}

export type MotivoNoPlanificado =
  | { tipo: 'HORAS_INVALIDAS' }
  | { tipo: 'SIN_CICLOS_FUTUROS' }
  | { tipo: 'DEPENDENCIA_CIRCULAR' }
  | { tipo: 'REQUISITO_SIN_ESPACIO'; requisito: { codigo: string; nombre: string }; periodo: PeriodoAcademico }
  | { tipo: 'REQUISITO_NO_PROGRAMADO'; requisito: { codigo: string; nombre: string } }
  | { tipo: 'SIN_ESPACIO'; cicloFinal: number; limiteHoras: number }
  | { tipo: 'ELECTIVO_ESPERA_OBLIGATORIOS' };

export interface CursoNoPlanificado {
  codigo: string;
  nombre: string;
  motivos: MotivoNoPlanificado[];
}

export type ExplicacionPlan =
  | { tipo: 'RESUMEN'; total: number; cicloInicio: number; cicloFinal: number }
  | { tipo: 'LIMITE'; horas: number }
  | { tipo: 'PRIORIDAD_OBLIGATORIOS' }
  | { tipo: 'APROBADOS_SIN_CARGA' }
  | { tipo: 'REQUISITOS_EXTERNOS' }
  | { tipo: 'CICLOS_EXCLUIDOS'; ciclos: number[] }
  | { tipo: 'ELECTIVO_ELEGIDO'; curso: { nombre: string; horasSemanales: number; creditos: number } }
  | { tipo: 'ELECTIVO_CUBIERTO' }
  | { tipo: 'CONSERVADOS'; total: number }
  | { tipo: 'PENDIENTES'; total: number }
  | { tipo: 'COMPLETADOS' }
  | { tipo: 'ADVERTENCIAS_HORAS'; horas: number };

export interface ResultadoPlanificacionAutomatica {
  cursos: Curso[];
  cicloInicio: number;
  cicloFinal: number;
  periodoInicio: PeriodoAcademico;
  limiteHoras: number;
  totalPlanificados: number;
  totalConservados: number;
  ciclos: CicloPlanificadoResumen[];
  noPlanificados: CursoNoPlanificado[];
  explicacion: ExplicacionPlan[];
  advertenciasHoras: { periodo: PeriodoAcademico; total: number; limite: number }[];
}

export interface OpcionesPlanificacion {
  totalCiclos?: number;
  ciclosExcluidos?: number[];
  cicloActual?: number | null;
  periodoIngreso?: PeriodoIngreso | null;
}
