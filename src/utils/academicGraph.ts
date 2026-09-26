import type { Curso, CursoReferencia, PeriodoAcademico } from '../types/academic';
import { crearPeriodoRegular, obtenerPeriodoCurso } from '../domain/rules/academicPeriodRules';

const ESTADOS_CUMPLIDOS = new Set(['APROBADO', 'CONVALIDADO']);

/**
 * Determina si un curso tiene todos sus prerrequisitos aprobados/convalidados.
 * Se usa para el estado visual de las tarjetas del banco.
 */
export const isCursoDesbloqueado = (curso: Curso, todosLosCursos: Curso[]): boolean => {
  if (ESTADOS_CUMPLIDOS.has(curso.estado)) return false;
  if (curso.prerrequisitos.length === 0) return true;

  const cursosAprobados = new Set(
    todosLosCursos
      .filter((c) => ESTADOS_CUMPLIDOS.has(c.estado))
      .map((c) => c.codigo)
  );

  return curso.prerrequisitos.every((req) => cursosAprobados.has(req));
};

/**
 * Valida un movimiento a un periodo concreto.
 * Un prerrequisito es válido si ya fue aprobado/convalidado o si está
 * planificado en un periodo cronológicamente anterior al destino.
 *
 * Esto permite, por ejemplo:
 * Ciclo 3 -> Verano 3 -> Ciclo 4
 * de modo que un curso llevado en Verano 3 habilite uno del Ciclo 4.
 */
export const validarPrerequisitosParaPeriodo = (
  curso: Curso,
  todosLosCursos: Curso[],
  periodoDestino: PeriodoAcademico
): { valido: boolean; faltantes: CursoReferencia[] } => {
  if (curso.prerrequisitos.length === 0) return { valido: true, faltantes: [] };

  const porCodigo = new Map(todosLosCursos.map((item) => [item.codigo, item]));
  const faltantes: CursoReferencia[] = [];

  for (const codigoPrerequisito of curso.prerrequisitos) {
    const prerequisito = porCodigo.get(codigoPrerequisito);

    // Algunos planes incluyen requisitos externos/nivelación que no aparecen como curso.
    // Se conserva el comportamiento actual: esas referencias no bloquean un movimiento manual.
    if (!prerequisito) continue;

    if (ESTADOS_CUMPLIDOS.has(prerequisito.estado)) continue;

    const planificadoAntes =
      prerequisito.ubicacion === 'periodo' &&
      obtenerPeriodoCurso(prerequisito).orden < periodoDestino.orden;

    if (planificadoAntes) continue;

    faltantes.push({
      codigo: prerequisito.codigo,
      nombre: prerequisito.nombre,
    });
  }

  return { valido: faltantes.length === 0, faltantes };
};

/** Compatibilidad con llamadas antiguas que solo conocen ciclos regulares. */
export const validarPrerequisitosParaCiclo = (
  curso: Curso,
  todosLosCursos: Curso[],
  cicloDestino: number
): { valido: boolean; faltantes: CursoReferencia[] } =>
  validarPrerequisitosParaPeriodo(curso, todosLosCursos, crearPeriodoRegular(cicloDestino));

/** Cursos planificados que pierden una secuencia válida tras cambiar otra asignación. */
export const detectarNuevosConflictosDescendientes = (
  anteriores: Curso[],
  siguientes: Curso[],
  codigoMovido: string
): CursoReferencia[] => {
  const porCodigoAnterior = new Map(anteriores.map((curso) => [curso.codigo, curso]));
  return siguientes
    .filter((curso) => curso.codigo !== codigoMovido && curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo')
    .filter((curso) => {
      const anterior = porCodigoAnterior.get(curso.codigo);
      if (!anterior || anterior.ubicacion !== 'periodo') return false;
      const antes = validarPrerequisitosParaPeriodo(anterior, anteriores, obtenerPeriodoCurso(anterior));
      const despues = validarPrerequisitosParaPeriodo(curso, siguientes, obtenerPeriodoCurso(curso));
      return antes.valido && !despues.valido;
    })
    .map((curso) => ({ codigo: curso.codigo, nombre: curso.nombre }));
};

/**
 * Genera una representación del grafo académico.
 * Las claves representan cursos y los valores sus dependientes.
 */
export const construirGrafoAcademico = (cursos: Curso[]): Map<string, string[]> => {
  const grafo = new Map<string, string[]>();

  cursos.forEach((curso) => grafo.set(curso.codigo, []));

  cursos.forEach((curso) => {
    curso.prerrequisitos.forEach((requisito) => {
      grafo.get(requisito)?.push(curso.codigo);
    });
  });

  return grafo;
};

/** Ordenamiento topológico básico para conocer el orden académico posible. */
export const obtenerOrdenTopologico = (cursos: Curso[]): string[] => {
  const grafo = construirGrafoAcademico(cursos);
  const grados = new Map<string, number>();

  cursos.forEach((curso) => grados.set(curso.codigo, 0));

  grafo.forEach((dependientes) => {
    dependientes.forEach((dependiente) => {
      grados.set(dependiente, (grados.get(dependiente) ?? 0) + 1);
    });
  });

  const cola = [...grados.entries()]
    .filter(([, grado]) => grado === 0)
    .map(([codigo]) => codigo);

  const resultado: string[] = [];

  while (cola.length) {
    const actual = cola.shift()!;
    resultado.push(actual);

    (grafo.get(actual) ?? []).forEach((siguiente) => {
      grados.set(siguiente, grados.get(siguiente)! - 1);

      if (grados.get(siguiente) === 0) {
        cola.push(siguiente);
      }
    });
  }

  return resultado;
};
