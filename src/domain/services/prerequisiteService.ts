import type { Curso, CursoReferencia, PeriodoAcademico, PeriodoIngreso } from '../../types/academic';
import {
  crearPeriodoRegular, crearPeriodoVerano, determinarPeriodoEnCurso,
  determinarPrimerPeriodoPlanificable, obtenerPeriodoCurso,
} from '../rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual, permiteVeranoDespuesDe } from '../rules/academicContextRules';
import { esJaladoSinReplanificar } from '../rules/courseRules';

const ESTADOS_CUMPLIDOS = new Set(['APROBADO', 'CONVALIDADO']);

export interface ContextoPrerrequisitos {
  cicloActual?: number | null;
  periodoIngreso?: PeriodoIngreso | null;
}

/** Ciclo actual explícito o, si no se configuró, el ciclo que concentra los cursos EN_CURSO. */
const resolverCicloActual = (cursos: Curso[], contexto: ContextoPrerrequisitos): number | null =>
  contexto.cicloActual ?? determinarPeriodoEnCurso(cursos)?.cicloReferencia ?? null;

/**
 * Regla única de prerrequisitos. Un prerrequisito está cumplido para un destino si:
 * a) es APROBADO o CONVALIDADO;
 * b) es EN_CURSO y el destino es posterior al ciclo actual (el plan asume que se aprobará);
 * c) es PENDIENTE y está ubicado en un periodo anterior al destino que no está bloqueado; o
 * d) no existe en la malla (nivelación / requisito externo).
 * Un curso jalado que sigue en su ciclo original nunca cumple.
 */
export const prerrequisitoCumplido = (
  codigo: string,
  cursos: Curso[],
  periodoDestino: PeriodoAcademico,
  contexto: ContextoPrerrequisitos = {}
): boolean => {
  const requisito = cursos.find((curso) => curso.codigo === codigo);
  if (!requisito) return true;
  if (ESTADOS_CUMPLIDOS.has(requisito.estado)) return true;

  const cicloActual = resolverCicloActual(cursos, contexto);
  if (requisito.estado === 'EN_CURSO') {
    const periodoActual = cicloActual ? crearPeriodoRegular(cicloActual) : obtenerPeriodoCurso(requisito);
    return periodoDestino.orden > periodoActual.orden;
  }

  if (requisito.ubicacion !== 'periodo' || esJaladoSinReplanificar(requisito, cicloActual)) return false;
  const periodoRequisito = obtenerPeriodoCurso(requisito);
  if (cicloActual && periodoBloqueadoPorCicloActual(periodoRequisito, cicloActual)) return false;
  return periodoRequisito.orden < periodoDestino.orden;
};

/** Primer periodo donde el estudiante todavía puede matricular cursos nuevos. */
const proximoPeriodoPlanificable = (cursos: Curso[], contexto: ContextoPrerrequisitos): PeriodoAcademico => {
  if (!contexto.cicloActual) return determinarPrimerPeriodoPlanificable(cursos);
  return contexto.periodoIngreso && permiteVeranoDespuesDe(contexto.cicloActual, contexto.periodoIngreso)
    ? crearPeriodoVerano(contexto.cicloActual)
    : crearPeriodoRegular(contexto.cicloActual + 1);
};

/**
 * Determina si un curso tiene sus prerrequisitos cumplidos para el próximo
 * periodo planificable. Se usa para el estado visual de las tarjetas.
 */
export const isCursoDesbloqueado = (
  curso: Curso,
  todosLosCursos: Curso[],
  contexto: ContextoPrerrequisitos = {}
): boolean => {
  if (ESTADOS_CUMPLIDOS.has(curso.estado)) return false;
  if (curso.prerrequisitos.length === 0) return true;
  const destino = proximoPeriodoPlanificable(todosLosCursos, contexto);
  return curso.prerrequisitos.every((codigo) =>
    prerrequisitoCumplido(codigo, todosLosCursos, destino, contexto));
};

/**
 * Valida un movimiento a un periodo concreto con la regla única de
 * prerrequisitoCumplido. Permite, por ejemplo, Ciclo 3 -> Verano 3 -> Ciclo 4:
 * un curso llevado en Verano 3 habilita uno del Ciclo 4.
 */
export const validarPrerequisitosParaPeriodo = (
  curso: Curso,
  todosLosCursos: Curso[],
  periodoDestino: PeriodoAcademico,
  contexto: ContextoPrerrequisitos = {}
): { valido: boolean; faltantes: CursoReferencia[] } => {
  if (curso.prerrequisitos.length === 0) return { valido: true, faltantes: [] };

  const porCodigo = new Map(todosLosCursos.map((item) => [item.codigo, item]));
  const faltantes = curso.prerrequisitos
    .filter((codigo) => !prerrequisitoCumplido(codigo, todosLosCursos, periodoDestino, contexto))
    .map((codigo) => ({ codigo, nombre: porCodigo.get(codigo)!.nombre }));

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
  codigoMovido: string,
  contexto: ContextoPrerrequisitos = {}
): CursoReferencia[] => {
  const porCodigoAnterior = new Map(anteriores.map((curso) => [curso.codigo, curso]));
  return siguientes
    .filter((curso) => curso.codigo !== codigoMovido && curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo')
    .filter((curso) => {
      const anterior = porCodigoAnterior.get(curso.codigo);
      if (!anterior || anterior.ubicacion !== 'periodo') return false;
      const antes = validarPrerequisitosParaPeriodo(anterior, anteriores, obtenerPeriodoCurso(anterior), contexto);
      const despues = validarPrerequisitosParaPeriodo(curso, siguientes, obtenerPeriodoCurso(curso), contexto);
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
