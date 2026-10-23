import defaultUniversityConfig from '../../data/universidades/pe-utp/university.json';
import type { UniversityConfig } from '../../types/university';
import { validateUniversityConfig } from './schemas/universityConfigValidator';

export class UniversityConfigLoader {
  static load(): UniversityConfig {
    return validateUniversityConfig(defaultUniversityConfig);
  }
}
