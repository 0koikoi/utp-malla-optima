// Tarifario UTP — Sede Ate · 2025
// Estructura de costos para ciclo regular y verano, con descuentos por convenio bancario.
// Los rangos se basan en horas semanales de carga académica (no en créditos).
// Autor: sixseven
//
// TODO (futura implementación): Ampliar con tarifarios de otras sedes (Lima Norte, SJL, provincias)
//   y otras facultades (Salud, Comunicación) cuando se tenga el dato oficial actualizado.
//   Actualmente solo se validan dos grupos tarifarios: ingeniería y gestión.
const COSTOS_FIJOS = {
    matriculaRegular: 398.00,
    matriculaVerano: 190.00,
    limiteCreditosVerano: 11
};

const ESTRUCTURA_TARIFARIA = {
    "ingenieria": {
        nombre: "Ingeniería y Arquitectura",
        precioBase: 815.00,
        horaExtra: 38.81,
        limiteHoras: 22,
        rangos: [
            { min: 16, max: 22, precio: 815.00 },
            { min: 12, max: 15, precio: 725.35 },
            { min: 7, max: 11, precio: 570.50 },
            { min: 1, max: 6, precio: 407.50 }
        ]
    },
    "gestion": {
        nombre: "Gestión y Humanidades / Psicología",
        precioBase: 770.00,
        horaExtra: 36.67,
        limiteHoras: 22,
        rangos: [
            { min: 16, max: 22, precio: 770.00 },
            { min: 12, max: 15, precio: 685.30 },
            { min: 7, max: 11, precio: 539.00 },
            { min: 1, max: 6, precio: 385.00 }
        ]
    }
};

const DESCUENTOS = {
    "ninguno": 0.0,
    "bcp": 0.025,
    "interbank": 0.025,
    "scotiabank": 0.05,
    "BBVA": 0.05
};