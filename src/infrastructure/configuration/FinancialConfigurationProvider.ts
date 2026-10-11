import type { Tarifario } from '../../types/financial';
import type { UniversityConfig } from '../../types/university';
import { AcademicConfigLoader } from './AcademicConfigLoader';
import { UniversityConfigLoader } from './UniversityConfigLoader';
import './registerFinancialSources';
import { getFinancialSource, registerFinancialSource, type FinancialConfigSource } from './financialSourceRegistry';

/**
 * Punto único de composición de la configuración universitaria.
 * Los consumidores reciben el mismo Tarifario normalizado de siempre y no
 * necesitan conocer cómo está dividida la configuración en archivos JSON.
 */
export type { FinancialConfigSource } from './financialSourceRegistry';

export class FinancialConfigurationProvider {
  static register(source: FinancialConfigSource): void {
    registerFinancialSource(source);
  }

  static load(university: UniversityConfig = UniversityConfigLoader.load()): Tarifario {
    const source = getFinancialSource(university.reglasFinancierasId);
    if (!source) throw new Error(`No existe una fuente financiera para ${university.reglasFinancierasId}.`);
    const financial = source.load({
      sedeId: university.sedeId,
      tarifarioVersion: university.tarifarioVersion,
    });
    const academic = AcademicConfigLoader.load();

    return {
      universidadId: university.universidadId,
      reglasFinancierasId: university.reglasFinancierasId,
      tarifarioVersion: university.tarifarioVersion,
      sedeId: university.sedeId,
      moneda: university.moneda,
      sede: university.sede,
      modalidadEstudio: university.modalidadEstudio,
      vigencia: university.vigencia,
      modalidadPrincipal: financial.modalidadPrincipal,
      cuotasPorCiclo: financial.cuotasPorCiclo,
      cuotasPorVerano: financial.cuotasPorVerano,
      semanasPorCiclo: financial.semanasPorCiclo,
      costoMatriculaVerano: financial.costoMatriculaVerano,
      costoProgramaSaludEstudiantil: financial.costoProgramaSaludEstudiantil,
      metodosPago: financial.metodosPago,
      disciplinas: financial.disciplinas,
      descuentoPagoUnicoRegular: financial.descuentoPagoUnicoRegular,
      limitesAcademicos: academic.limitesAcademicos,
      multiplicadorHorasVerano: academic.verano?.multiplicadorHorasTarifarias,
    };
  }
}
