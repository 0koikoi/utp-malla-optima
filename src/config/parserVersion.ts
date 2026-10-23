/**
 * Versión del parser del Excel. Se guarda en el perfil al importar; si la malla
 * guardada viene de una versión anterior se recomienda (una sola vez) volver a
 * subir el Excel.
 * - 1: "DESAPROBADO" se importaba como APROBADO.
 * - 2: los estados de ESTADOS_EXCEL_JALADO se importan como jalados.
 */
export const VERSION_PARSER = 2;
