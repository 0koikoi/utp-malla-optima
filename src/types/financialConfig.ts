import type { ModalidadCalculo } from './academic';
import type { TarifasDetalle, MetodoPagoTarifario } from './financial';

/** Forma del archivo financial.json antes de componerlo con el resto de la configuración. */
export interface FinancialConfig {
  modalidadPrincipal: ModalidadCalculo;
  cuotasPorCiclo: number;
  cuotasPorVerano?: number;
  semanasPorCiclo: number;
  costoMatriculaVerano?: number;
  costoProgramaSaludEstudiantil?: number;
  metodosPago?: Record<string, MetodoPagoTarifario>;
  disciplinas: Record<string, TarifasDetalle>;
  descuentoPagoUnicoRegular?: number;
}
