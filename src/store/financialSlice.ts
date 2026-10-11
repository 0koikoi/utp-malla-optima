import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { migrateLegacyFinancialRulesReference } from '../financial/rules/financialRulesCompatibility';
import type { AcademicSlice, AcademicStore } from './types';

type FinancialSlice = Pick<AcademicStore, 'tarifario' | 'setTarifario'>;

export const createFinancialSlice = (repos: AcademicRepositories): AcademicSlice<FinancialSlice> => (set, get) => ({
  tarifario: null,
  setTarifario: async (tarifario) => {
    const normalizado = migrateLegacyFinancialRulesReference(tarifario);
    const disciplinas = Object.keys(normalizado.disciplinas);
    const actual = get().disciplinaActiva;
    const disciplinaActiva = disciplinas.includes(actual) ? actual : (disciplinas[0] ?? actual);
    await repos.transaction(async () => {
      await repos.financial.save(normalizado);
      await repos.profile.save({ universidadId: normalizado.universidadId, disciplinaActiva });
    });
    set({ tarifario: normalizado, disciplinaActiva });
  },
});
