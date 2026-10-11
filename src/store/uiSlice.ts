import type { AcademicSlice, AcademicStore } from './types';

type UiSlice = Pick<AcademicStore,
  'panelPlanificadorAbierto' | 'cursoAMover' | 'notificacionMovimiento' |
  'setPanelPlanificadorAbierto' | 'setCursoAMover' | 'limpiarNotificacionMovimiento'>;

export const createUiSlice: AcademicSlice<UiSlice> = (set) => ({
  panelPlanificadorAbierto: false,
  cursoAMover: null,
  notificacionMovimiento: null,
  setPanelPlanificadorAbierto: (panelPlanificadorAbierto) => set({ panelPlanificadorAbierto }),
  setCursoAMover: (cursoAMover) => set({ cursoAMover }),
  limpiarNotificacionMovimiento: () => set({ notificacionMovimiento: null }),
});
