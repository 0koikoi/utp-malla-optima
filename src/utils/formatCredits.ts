/** Redondea solo la presentación; las sumas y reglas conservan los créditos originales. */
export const formatCredits = (creditos: number): string => Math.round(creditos).toString();
