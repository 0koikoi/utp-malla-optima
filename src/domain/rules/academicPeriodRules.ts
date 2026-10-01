import type { Curso, PeriodoAcademico, TipoPeriodoAcademico } from '../../types/academic';

export const crearPeriodoAcademico = (
  tipo: TipoPeriodoAcademico,
  cicloReferencia: number
): PeriodoAcademico => {
  const ciclo = Math.max(1, Math.trunc(cicloReferencia));
  const esRegular = tipo === 'REGULAR';

  return {
    id: `${esRegular ? 'ciclo' : 'verano'}-${ciclo}` as PeriodoAcademico['id'],
    tipo,
    cicloReferencia: ciclo,
    orden: (ciclo - 1) * 2 + (esRegular ? 0 : 1),
    etiqueta: esRegular ? `Ciclo ${ciclo}` : `Verano después del ciclo ${ciclo}`,
  };
};

export const crearPeriodoRegular = (ciclo: number): PeriodoAcademico =>
  crearPeriodoAcademico('REGULAR', ciclo);

export const crearPeriodoVerano = (ciclo: number): PeriodoAcademico =>
  crearPeriodoAcademico('VERANO', ciclo);

export const obtenerPeriodoCurso = (curso: Pick<Curso, 'ciclo' | 'tipoPeriodo'>): PeriodoAcademico =>
  crearPeriodoAcademico(curso.tipoPeriodo ?? 'REGULAR', curso.ciclo || 1);

export const generarSecuenciaPeriodos = (
  totalCiclos: number,
  periodoIngreso: 'marzo' | 'agosto' = 'marzo'
): PeriodoAcademico[] => {
  const periodos: PeriodoAcademico[] = [];
  const total = Math.max(1, Math.trunc(totalCiclos));

  for (let ciclo = 1; ciclo <= total; ciclo += 1) {
    periodos.push(crearPeriodoRegular(ciclo));
    // En la UTP el ciclo de Verano se cursa en Enero (tras el ciclo de Agosto-Diciembre).
    // Si el estudiante inicia en marzo: los veranos van tras ciclos pares (2, 4, 6...).
    // Si el estudiante inicia en agosto: los veranos van tras ciclos impares (1, 3, 5...).
    const tieneVerano = periodoIngreso === 'marzo' ? ciclo % 2 === 0 : ciclo % 2 !== 0;
    if (tieneVerano) {
      periodos.push(crearPeriodoVerano(ciclo));
    }
  }

  return periodos;
};

export const siguientePeriodo = (
  periodo: PeriodoAcademico,
  periodoIngreso: 'marzo' | 'agosto' = 'marzo'
): PeriodoAcademico => {
  if (periodo.tipo === 'VERANO') {
    return crearPeriodoRegular(periodo.cicloReferencia + 1);
  }
  const tieneVerano = periodoIngreso === 'marzo'
    ? periodo.cicloReferencia % 2 === 0
    : periodo.cicloReferencia % 2 !== 0;

  return tieneVerano
    ? crearPeriodoVerano(periodo.cicloReferencia)
    : crearPeriodoRegular(periodo.cicloReferencia + 1);
};

/**
 * Determina el periodo que el estudiante está cursando actualmente.
 *
 * Cuando hay cursos EN_CURSO en distintos ciclos (por adelantos, retrasos o
 * cruces de malla), el periodo actual es aquel que concentra la MAYOR cantidad
 * de cursos EN_CURSO. Si hay empate, se toma el periodo cronológicamente más
 * avanzado.
 *
 * Devuelve null cuando el archivo no contiene ningún curso EN_CURSO.
 */
export const determinarPeriodoEnCurso = (cursos: Curso[]): PeriodoAcademico | null => {
  const conteoPorPeriodo = new Map<
    PeriodoAcademico['id'],
    { periodo: PeriodoAcademico; cantidad: number }
  >();

  cursos
    .filter((curso) => curso.estado === 'EN_CURSO')
    .forEach((curso) => {
      const periodo = obtenerPeriodoCurso(curso);
      const actual = conteoPorPeriodo.get(periodo.id);
      conteoPorPeriodo.set(periodo.id, {
        periodo,
        cantidad: (actual?.cantidad ?? 0) + 1,
      });
    });

  if (conteoPorPeriodo.size === 0) return null;

  const mejor = [...conteoPorPeriodo.values()]
    .sort((a, b) => b.cantidad - a.cantidad || b.periodo.orden - a.periodo.orden)[0];

  return mejor ? mejor.periodo : null;
};

/**
 * Periodo de referencia académica del estudiante.
 * - Si existen cursos EN_CURSO, usa el periodo con mayor cantidad de ellos.
 * - Si no existen, se toma el último APROBADO y se empieza en el periodo siguiente.
 * - Las convalidaciones aisladas no adelantan el punto de inicio.
 */
export const determinarPeriodoActual = (cursos: Curso[]): PeriodoAcademico => {
  const periodoEnCurso = determinarPeriodoEnCurso(cursos);
  if (periodoEnCurso) return periodoEnCurso;

  const aprobados = cursos.filter((curso) => curso.estado === 'APROBADO');
  if (aprobados.length > 0) {
    const ultimo = aprobados
      .map(obtenerPeriodoCurso)
      .sort((a, b) => b.orden - a.orden)[0];
    if (ultimo) return siguientePeriodo(ultimo);
  }

  return crearPeriodoRegular(1);
};

export const esPeriodoAnterior = (
  destino: PeriodoAcademico,
  referencia: PeriodoAcademico
): boolean => destino.orden < referencia.orden;

export const compararPeriodos = (a: PeriodoAcademico, b: PeriodoAcademico): number =>
  a.orden - b.orden;


/**
 * Primer periodo que puede usar el planificador automático.
 * Si hay un periodo EN_CURSO, se planifica a partir del siguiente porque el
 * algoritmo nunca altera la matrícula que el estudiante ya está cursando.
 */
export const determinarPrimerPeriodoPlanificable = (cursos: Curso[]): PeriodoAcademico => {
  const actual = determinarPeriodoActual(cursos);
  const periodoEnCurso = determinarPeriodoEnCurso(cursos);
  return periodoEnCurso ? siguientePeriodo(actual) : actual;
};
