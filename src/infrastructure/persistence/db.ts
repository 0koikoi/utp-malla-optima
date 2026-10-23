import Dexie, { type Table } from 'dexie';
import type { Curso } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import type { UserAcademicProfile } from '../../types/profile';
import { migrateLegacyFinancialRulesReference } from '../../financial/rules/financialRulesCompatibility';

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

    // Los registros antiguos se normalizan una vez al actualizar IndexedDB.
    this.version(7)
      .stores({
        profile: 'id, disciplinaActiva',
        courses: 'codigo, ciclo, cicloOrigen, tipoPeriodo, estado, ubicacion',
        customCosts: 'universidadId',
      })
      .upgrade(async (transaction) => {
        await transaction.table('courses').toCollection().modify((registro) => {
          const curso = registro as Curso;
          if (!curso.cicloOrigen) curso.cicloOrigen = curso.ciclo || 1;
          if (!curso.ciclo) curso.ciclo = curso.cicloOrigen;
          if (!curso.tipoPeriodo) curso.tipoPeriodo = 'REGULAR';
          if ((curso.ubicacion as string) === 'ciclo') curso.ubicacion = 'periodo';
          if (!curso.ubicacion) curso.ubicacion = curso.estado === 'PENDIENTE' ? 'banco' : 'periodo';
          if (!Array.isArray(curso.prerrequisitos)) curso.prerrequisitos = [];
        });
      });

  }
}

export const db = new AcademicDatabase();
