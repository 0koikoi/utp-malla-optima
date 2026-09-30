/**
 * AcademicPlannerDB — Base de datos IndexedDB (Dexie) del planificador.
 *
 * Esta es la ÚNICA instancia canónica de la BD. Preparada para el módulo IA.
 *
 * Historial de versiones:
 *   v2/v3 → histórico (migrados en services/db.ts antiguo)
 *   v5    → introduce tipoPeriodo + migra ubicacion 'ciclo' → 'periodo'
 *   v6    → migra tarifarios legacy con financialRulesCompatibility
 */
import Dexie, { type Table } from 'dexie';
import type { Curso, Tarifario } from '@/core/types';
import { migrateLegacyFinancialRulesReference } from '@/financial/rules/financialRulesCompatibility';

// ─── Entidades de persistencia ────────────────────────────────────────────────

export interface UserAcademicProfile {
  id: string;
  universidadId: string;
  carrera: string;
  disciplinaActiva: string;
  fechaActualizacion: string;
  nombreArchivoCargado?: string;
}

// ─── Base de datos ────────────────────────────────────────────────────────────

export class AcademicPlannerDB extends Dexie {
  profile!: Table<UserAcademicProfile, string>;
  courses!: Table<Curso, string>;
  customCosts!: Table<Tarifario, string>;

  constructor() {
    super('AcademicPlannerDB');

    // Versiones históricas conservadas para migración de usuarios existentes
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

    // v5: introduce periodos REGULAR/VERANO y migra ubicacion 'ciclo' → 'periodo'
    this.version(5)
      .stores({
        profile: 'id, disciplinaActiva',
        courses: 'codigo, ciclo, cicloOrigen, tipoPeriodo, estado, ubicacion',
        customCosts: 'universidadId',
      })
      .upgrade(async (transaction) => {
        await transaction.table('courses').toCollection().modify((registro) => {
          const legacy = registro as { ubicacion?: string; tipoPeriodo?: string };
          if (legacy.ubicacion === 'ciclo') legacy.ubicacion = 'periodo';
          if (!legacy.tipoPeriodo) legacy.tipoPeriodo = 'REGULAR';
        });
      });

    // v6: normaliza tarifarios con schema de reglas financieras actualizado
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

export const db = new AcademicPlannerDB();
