import type { Tarifario } from '../../types/financial';
import { AcademicConfigLoader } from './AcademicConfigLoader';
import { UtpFinancialConfigProvider } from './utp/UtpFinancialConfigProvider';
import { UniversityConfigLoader } from './UniversityConfigLoader';

/**
 * Punto único de composición de la configuración universitaria.
 * Los consumidores reciben el mismo Tarifario normalizado de siempre y no
 * necesitan conocer cómo está dividida la configuración en archivos JSON.
 */
export class FinancialConfigurationProvider {
  static load(): Tarifario {
    const university = UniversityConfigLoader.load();
    const financial = UtpFinancialConfigProvider.load({
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
