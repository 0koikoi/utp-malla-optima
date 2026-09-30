// Tarifario UTP — Sede Ate · Agosto 2026
// Fuente: Tarifario Oficial UTP 2026

export interface RangoTarifario {
  min: number;
  max: number;
  precio: number;
}

export interface EstructuraFacultad {
  nombre: string;
  precioBase: number;
  horaExtra: number;
  limiteHoras: number;
  rangos: RangoTarifario[];
}

export type FacultadKey = 'ingenieria' | 'salud_gestion' | 'farmacia' | 'gestion';

export const ESTRUCTURA_TARIFARIA: Record<FacultadKey, EstructuraFacultad> = {
  ingenieria: {
    nombre: 'Ingeniería y Arquitectura (Todas las carreras excepto Salud, Gestión y Humanidades)',
    precioBase: 815.0,
    horaExtra: 38.81,
    limiteHoras: 22,
    rangos: [
      { min: 16, max: 22, precio: 815.0 },
      { min: 12, max: 15, precio: 725.35 },
      { min: 7, max: 11, precio: 570.5 },
      { min: 1, max: 6, precio: 407.5 },
    ],
  },
  salud_gestion: {
    nombre: 'Ciencias de la Salud, Gestión y Humanidades (Excepto Farmacia y Bioquímica)',
    precioBase: 770.0,
    horaExtra: 36.67,
    limiteHoras: 22,
    rangos: [
      { min: 16, max: 22, precio: 770.0 },
      { min: 12, max: 15, precio: 685.3 },
      { min: 7, max: 11, precio: 539.0 },
      { min: 1, max: 6, precio: 385.0 },
    ],
  },
  farmacia: {
    nombre: 'Carrera de Farmacia y Bioquímica',
    precioBase: 815.0,
    horaExtra: 38.81,
    limiteHoras: 22,
    rangos: [
      { min: 16, max: 22, precio: 815.0 },
      { min: 12, max: 15, precio: 725.35 },
      { min: 7, max: 11, precio: 570.5 },
      { min: 1, max: 6, precio: 407.5 },
    ],
  },
  // Alias para mantener compatibilidad con estados previos de localStorage o respaldos
  gestion: {
    nombre: 'Ciencias de la Salud, Gestión y Humanidades (Excepto Farmacia y Bioquímica)',
    precioBase: 770.0,
    horaExtra: 36.67,
    limiteHoras: 22,
    rangos: [
      { min: 16, max: 22, precio: 770.0 },
      { min: 12, max: 15, precio: 685.3 },
      { min: 7, max: 11, precio: 539.0 },
      { min: 1, max: 6, precio: 385.0 },
    ],
  },
};



export const COSTOS_FIJOS = {
  matriculaRegular: 398.0,
  matriculaVerano: 190.0,
  limiteCreditosVerano: 11,
  limiteElectivosMinimo: 3, // créditos electivos mínimos en toda la carrera
} as const;
