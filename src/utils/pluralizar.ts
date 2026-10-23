/** Elige el texto según la cantidad: pluralizar(1, 'curso', 'cursos') → 'curso'. */
export const pluralizar = (n: number, singular: string, plural: string): string =>
  n === 1 ? singular : plural;
