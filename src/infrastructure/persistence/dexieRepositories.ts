import type {
  AcademicRepositories, CourseRepository, FinancialRepository, ProfileRepository,
} from '../../application/ports/AcademicRepositories';
import { DEFAULT_PROFILE } from '../../config/defaultProfile';
import type { Curso } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import type { UserAcademicProfile } from '../../types/profile';
import { AcademicDatabase, db } from './db';

const PROFILE_ID = 'current_profile';

class DexieCourseRepository implements CourseRepository {
  private readonly database: AcademicDatabase;
  constructor(database: AcademicDatabase) { this.database = database; }

  getAll(): Promise<Curso[]> {
    return this.database.courses.toArray();
  }

  async replaceAll(cursos: Curso[]): Promise<void> {
    await this.database.transaction('rw', this.database.courses, async () => {
      await this.database.courses.clear();
      await this.database.courses.bulkPut(cursos);
    });
  }

  async saveMany(cursos: Curso[]): Promise<void> {
    if (cursos.length) await this.database.courses.bulkPut(cursos);
  }

  async update(codigo: string, cambios: Partial<Curso>): Promise<void> {
    const updated = await this.database.courses.update(codigo, cambios);
    if (!updated) throw new Error(`No se encontró el curso ${codigo} al guardar.`);
  }
}

class DexieProfileRepository implements ProfileRepository {
  private readonly database: AcademicDatabase;
  constructor(database: AcademicDatabase) { this.database = database; }

  get(): Promise<UserAcademicProfile | undefined> {
    return this.database.profile.get(PROFILE_ID);
  }

  async save(cambios: Partial<UserAcademicProfile>): Promise<UserAcademicProfile> {
    const actual = await this.get();
    const perfil: UserAcademicProfile = {
      ...DEFAULT_PROFILE,
      ...actual,
      ...cambios,
      id: PROFILE_ID,
      fechaActualizacion: new Date().toISOString(),
    };
    await this.database.profile.put(perfil);
    return perfil;
  }
}

class DexieFinancialRepository implements FinancialRepository {
  private readonly database: AcademicDatabase;
  constructor(database: AcademicDatabase) { this.database = database; }

  async get(): Promise<Tarifario | undefined> {
    return (await this.database.customCosts.toArray())[0];
  }

  async save(tarifario: Tarifario): Promise<void> {
    await this.database.transaction('rw', this.database.customCosts, async () => {
      await this.database.customCosts.clear();
      await this.database.customCosts.put(tarifario);
    });
  }

  async replace(tarifario: Tarifario): Promise<void> {
    await this.save(tarifario);
  }
}

export const createDexieRepositories = (database: AcademicDatabase = db): AcademicRepositories => ({
  courses: new DexieCourseRepository(database),
  profile: new DexieProfileRepository(database),
  financial: new DexieFinancialRepository(database),
  transaction: (action) => database.transaction(
    'rw', database.courses, database.profile, database.customCosts, action
  ),
});
