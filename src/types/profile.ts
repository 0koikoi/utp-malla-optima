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
}
