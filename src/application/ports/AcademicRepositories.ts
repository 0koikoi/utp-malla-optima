import type { Curso } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import type { UserAcademicProfile } from '../../types/profile';

export interface CourseRepository {
  getAll(): Promise<Curso[]>;
  replaceAll(cursos: Curso[]): Promise<void>;
  saveMany(cursos: Curso[]): Promise<void>;
  update(codigo: string, cambios: Partial<Curso>): Promise<void>;
}

export interface ProfileRepository {
  get(): Promise<UserAcademicProfile | undefined>;
  save(cambios: Partial<UserAcademicProfile>): Promise<UserAcademicProfile>;
}

export interface FinancialRepository {
  get(): Promise<Tarifario | undefined>;
  save(tarifario: Tarifario): Promise<void>;
  replace(tarifario: Tarifario): Promise<void>;
}

export interface AcademicRepositories {
  courses: CourseRepository;
  profile: ProfileRepository;
  financial: FinancialRepository;
  transaction<T>(action: () => Promise<T>): Promise<T>;
}
