// Tarifario UTP — Sede Ate · 2026
// Fuente: log.js del proyecto vanilla (migrado a TypeScript)

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

export type FacultadKey = 'ingenieria' | 'gestion';
export type DescuentoKey = 'ninguno' | 'bcp' | 'scotiabank';

export const ESTRUCTURA_TARIFARIA: Record<FacultadKey, EstructuraFacultad> = {
  ingenieria: {
    nombre: 'Ingeniería y Arquitectura',
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
  gestion: {
    nombre: 'Gestión y Humanidades / Psicología',
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

export const DESCUENTOS: Record<DescuentoKey, number> = {
  ninguno: 0.0,
  bcp: 0.025,
  scotiabank: 0.05,
};

export const COSTOS_FIJOS = {
  matriculaRegular: 398.0,
  matriculaVerano: 190.0,
  limiteCreditosVerano: 11,
  limiteElectivosMinimo: 3, // créditos electivos mínimos en toda la carrera
} as const;
