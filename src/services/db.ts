import Dexie, { type Table } from 'dexie';
import type { Curso, Tarifario } from '../types/academic';

export interface UserAcademicProfile {
  id: string;
  universidadId: string;
  carrera: string;
  disciplinaActiva: string;
  fechaActualizacion: string;
  nombreArchivoCargado?: string;
}

export class AcademicDatabase extends Dexie {
  profile!: Table<UserAcademicProfile, string>;
  courses!: Table<Curso, string>;
  customCosts!: Table<Tarifario, string>;

  constructor() {
    super('AcademicPlannerDB');

    this.version(2).stores({
      profile: 'id, disciplinaActiva',
      courses: 'codigo, ciclo, estado',
      customCosts: 'universidadId',
    });

    // v3 agrega cicloOrigen y ubicacion para separar de forma real banco/ciclos.
    this.version(3).stores({
      profile: 'id, disciplinaActiva',
      courses: 'codigo, ciclo, cicloOrigen, estado, ubicacion',
      customCosts: 'universidadId',
    });
  }
}

export const db = new AcademicDatabase();
