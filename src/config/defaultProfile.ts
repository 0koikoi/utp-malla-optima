import university from '../data/universidades/pe-utp/university.json';

export const DEFAULT_PROFILE = {
  universidadId: university.universidadId,
  carrera: 'Ingeniería de Sistemas e Informática',
  disciplinaActiva: 'Ingeniería y Arquitectura',
} as const;
