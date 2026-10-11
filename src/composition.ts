import { AdapterRegistry } from './adapters/AdapterRegistry';
import { UTPExcelAdapter } from './adapters/utpExcelAdapter';
import { DEFAULT_PROFILE } from './config/defaultProfile';
import { createDexieRepositories } from './infrastructure/persistence/dexieRepositories';
import { createAcademicStore } from './store/createAcademicStore';

export const academicRepositories = createDexieRepositories();
export const useAcademicStore = createAcademicStore(academicRepositories);
export const adapterRegistry = new AdapterRegistry();
adapterRegistry.register(new UTPExcelAdapter(DEFAULT_PROFILE.universidadId));
