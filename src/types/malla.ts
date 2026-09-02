// Tipos de dominio del proyecto
// Centralizados aquí para importar desde cualquier módulo

export type EstadoCurso = 'PENDIENTE' | 'APROBADO' | 'CONVALIDADO';
export type TipoCurso = 'O' | 'E'; // Obligatorio | Electivo
export type TipoCiclo = 'regular' | 'verano';

/** Identificador de ubicación de un curso en el planificador */
export type UbicacionCurso =
  | `ciclo-${number}`      // e.g. 'ciclo-3'
  | `verano-${number}`     // e.g. 'verano-1'
  | 'pozo';                // panel de pendientes

export interface Curso {
  codigo: string;
  nombre: string;
  horas: number;
  creditos: number;
  tipo: TipoCurso;
  estado: EstadoCurso;
  prerequisitos: string[];  // códigos de cursos prerrequisito
  habilitaA: string[];      // nombres de cursos que este habilita (calculado)
  cicloOrigen: number;      // ciclo de la malla oficial
}

/** Dato calculado por ciclo visible en el planificador */
export interface FinanzasCiclo {
  cicloId: string;
  horas: number;
  creditos: number;
  costoFinal: number;
  matricula: number;
  excesoHoras: boolean;
  excesoCreditosVerano: boolean;
}

/** Snapshot de la malla guardada en localStorage */
export interface MallaSnapshot {
  version: 1;
  timestamp: string;
  nombreArchivo: string;
  cursos: Record<string, Curso>;
}
