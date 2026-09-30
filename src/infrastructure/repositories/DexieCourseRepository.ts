import type { Curso } from '../../types/academic';
import { db } from '../../services/db';
import type { CourseRepository } from '../../domain/repositories/CourseRepository';

export class DexieCourseRepository implements CourseRepository {
  findAll() { return db.courses.toArray(); }
  async saveAll(cursos: Curso[]) {
    await db.courses.clear();
    await db.courses.bulkPut(cursos);
  }
  update(codigo: string, data: Partial<Curso>) {
    return db.courses.update(codigo, data).then(() => undefined);
  }
}
