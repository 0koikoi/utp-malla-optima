import type { Curso } from '@/core/types';

export interface CurriculumAdapter {
  readonly universidadId: string;
  parse(file: File): Promise<Curso[]>;
}
