import Dexie, { type Table } from 'dexie';
import type { Curso, Tarifario } from '../../types/academic';
import type { UserAcademicProfile } from '../../services/db';

export class AcademicPlannerDB extends Dexie {
  profile!: Table<UserAcademicProfile, string>;
  courses!: Table<Curso, string>;
  customCosts!: Table<Tarifario, string>;

  constructor() {
    super('AcademicPlannerDB');

    this.version(4).stores({
      profile: 'id, disciplinaActiva',
      courses: 'codigo, ciclo, cicloOrigen, estado, ubicacion',
      customCosts: 'universidadId',
    });
  }
}

export const academicDB = new AcademicPlannerDB();
