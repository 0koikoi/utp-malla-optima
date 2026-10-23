import defaultAcademicConfig from '../../data/universidades/pe-utp/academic.json';
import type { AcademicConfig } from '../../types/academicConfig';
import { validateAcademicConfig } from './schemas/academicConfigValidator';

export class AcademicConfigLoader {
  static load(): AcademicConfig {
    return validateAcademicConfig(defaultAcademicConfig);
  }
}
