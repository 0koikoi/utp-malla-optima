import type { PeriodoIngreso } from './academic';

export interface UserAcademicProfile {
  id: string;
  universidadId: string;
  carrera: string;
  disciplinaActiva: string;
  fechaActualizacion: string;
  nombreArchivoCargado?: string;
  periodoIngreso?: PeriodoIngreso;
  cicloActual?: number;
  totalCiclos?: number;
  ciclosExcluidos?: number[];
  /** VERSION_PARSER con la que se importó la malla guardada (sin valor = 1). */
  versionParser?: number;
  /** Última VERSION_PARSER para la que ya se mostró el aviso de volver a subir el Excel. */
  avisoVersionParser?: number;
}
