import type { CurriculumAdapter } from './CurriculumAdapter';

export class AdapterRegistry {
  private readonly adapters = new Map<string, CurriculumAdapter>();

  register(adapter: CurriculumAdapter): void {
    this.adapters.set(adapter.universidadId, adapter);
  }

  get(universidadId: string): CurriculumAdapter {
    const adapter = this.adapters.get(universidadId);

    if (!adapter) {
      throw new Error(`No existe un adaptador registrado para ${universidadId}`);
    }

    return adapter;
  }
}

export const adapterRegistry = new AdapterRegistry();
