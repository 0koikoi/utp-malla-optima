import type { Curso } from '../types/academic';

export interface CurriculumAdapter {
  readonly universidadId: string;
  parse(file: File): Promise<Curso[]>;
}
