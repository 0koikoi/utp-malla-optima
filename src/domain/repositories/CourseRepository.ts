import type { Curso } from '@/core/types';

export interface CourseRepository {
  findAll(): Promise<Curso[]>;
  saveAll(cursos: Curso[]): Promise<void>;
  update(codigo: string, data: Partial<Curso>): Promise<void>;
}
