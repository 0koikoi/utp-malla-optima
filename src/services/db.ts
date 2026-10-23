import Dexie, { type Table } from 'dexie';
import type { Curso } from '../types/academic';
import type { Tarifario } from '../types/financial';
import { migrateLegacyFinancialRulesReference } from '../financial/rules/financialRulesCompatibility';

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

    this.version(3).stores({
      profile: 'id, disciplinaActiva',
      courses: 'codigo, ciclo, cicloOrigen, estado, ubicacion',
      customCosts: 'universidadId',
    });

    // v5 introduce periodos académicos REGULAR/VERANO y migra la ubicación
    // histórica `ciclo` a la ubicación genérica `periodo`.
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

    this.version(6)
      .stores({
        profile: 'id, disciplinaActiva',
        courses: 'codigo, ciclo, cicloOrigen, tipoPeriodo, estado, ubicacion',
        customCosts: 'universidadId',
      })
      .upgrade(async (transaction) => {
        await transaction.table('customCosts').toCollection().modify((registro) => {
          const tarifario = registro as Tarifario;
          const migrado = migrateLegacyFinancialRulesReference(tarifario);
          if (migrado !== tarifario) Object.assign(registro, migrado);
        });
      });

  }
}

export const db = new AcademicDatabase();
