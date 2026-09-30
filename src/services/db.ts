/**
 * @deprecated — TRANSITIONAL SHIM
 *
 * services/db.ts re-exporta desde la instancia canónica en infrastructure/persistence/.
 * Los consumidores existentes (DexieCourseRepository) seguirán funcionando sin cambios.
 *
 * Migrar importadores de:
 *   import { db } from '@/services/db'
 * a:
 *   import { db } from '@/infrastructure/persistence/AcademicPlannerDB'
 */
export { db, type UserAcademicProfile } from '@/infrastructure/persistence/AcademicPlannerDB';
