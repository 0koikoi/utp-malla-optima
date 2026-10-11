import { create } from 'zustand';
import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { createCourseActionsSlice } from './courseActionsSlice';
import { createCourseImportSlice } from './courseImportSlice';
import { createFinancialSlice } from './financialSlice';
import { createPlanningSlice } from './planningSlice';
import { createProfileSlice } from './profileSlice';
import { createUiSlice } from './uiSlice';
import type { AcademicStore } from './types';

export const createAcademicStore = (repos: AcademicRepositories) => create<AcademicStore>()((...args) => ({
  ...createUiSlice(...args),
  ...createProfileSlice(repos)(...args),
  ...createCourseImportSlice(repos)(...args),
  ...createCourseActionsSlice(repos)(...args),
  ...createPlanningSlice(repos)(...args),
  ...createFinancialSlice(repos)(...args),
}));
