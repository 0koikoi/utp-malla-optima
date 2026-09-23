import Dexie, { type Table } from 'dexie';
import type { Curso, Tarifario } from '../../types/academic';
import type { UserAcademicProfile } from '../../services/db';

export class AcademicPlannerDB extends Dexie {
  profile!: Table<UserAcademicProfile, string>;
  courses!: Table<Curso, string>;
  customCosts!: Table<Tarifario, string>;

  constructor() {
    super('AcademicPlannerDB');

    this.version(5)
      .stores({
        profile: 'id, disciplinaActiva',
        courses: 'codigo, ciclo, cicloOrigen, tipoPeriodo, estado, ubicacion',
        customCosts: 'universidadId',
      })
      .upgrade(async (transaction) => {
        await transaction.table('courses').toCollection().modify((registro) => {
          const curso = registro as Curso;
          const legacy = registro as { ubicacion?: string; tipoPeriodo?: string };
          if (legacy.ubicacion === 'ciclo') curso.ubicacion = 'periodo';
          if (!legacy.tipoPeriodo) curso.tipoPeriodo = 'REGULAR';
        });
      });
  }
}

export const academicDB = new AcademicPlannerDB();
