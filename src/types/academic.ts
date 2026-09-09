export type EstadoCurso = 'APROBADO' | 'CONVALIDADO' | 'EN_CURSO' | 'PENDIENTE';
export type TipoCurso = 'OBLIGATORIO' | 'ELECTIVO';
export type ModalidadCalculo = 'POR_CREDITO' | 'POR_HORA' | 'POR_CURSO' | 'ESCALA_FIJA';
export type UbicacionCurso = 'banco' | 'ciclo';

export interface Curso {
  codigo: string;
  nombre: string;
  disciplina?: string;
  /** Ciclo donde está ubicado actualmente dentro del planificador. */
  ciclo: number;
  /** Ciclo original de la malla. Se conserva aunque el alumno reprograme el curso. */
  cicloOrigen: number;
  /** Evita duplicar un curso entre el banco y los ciclos. */
  ubicacion: UbicacionCurso;
  horasSemanales: number;
  creditos: number;
  tipo: TipoCurso;
  prerrequisitos: string[];
  esLaboratorio?: boolean;
  estado: EstadoCurso;
}

export interface TarifasDetalle {
  costoMatriculaRegular: number;
  costoPorCredito: number;
  costoPorHora: number;
  costoPorCurso: number;
  costoFijoLaboratorio: number;
  recargoRepitenciaPorcentaje: number;
}

export interface Tarifario {
  universidadId: string;
  moneda: string;
  modalidadPrincipal: ModalidadCalculo;
  cuotasPorCiclo: number;
  semanasPorCiclo: number;
  disciplinas: Record<string, TarifasDetalle>;
  limitesAcademicos?: {
    creditosMinimos: number;
    creditosMaximos: number;
  };
}

export interface ResumenFinanciero {
  totalCreditos: number;
  totalHorasSemanales: number;
  costoMatricula: number;
  costoEnsenanzaTotal: number;
  costoTotalCiclo: number;
  montoPorCuota: number;
}

export interface CursoReferencia {
  codigo: string;
  nombre: string;
}

export interface NotificacionMovimiento {
  tipo: 'PRERREQUISITOS' | 'INMOVIBLE';
  cursoNombre: string;
  faltantes?: CursoReferencia[];
}
