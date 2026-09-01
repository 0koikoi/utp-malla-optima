import Dexie, { type Table } from 'dexie';
import type { Curso, Tarifario } from '../types/academic';

export interface UserAcademicProfile {
  id: string; // 'perfil actual'
  universidadId: string;
  carrera: string;
  disciplinaActiva: string;
  fechaActualizacion: string;
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
      customCosts: 'universidadId'
    });
  }
}

export const db = new AcademicDatabase();