import type { Curso, PeriodoAcademico } from '../../types/academic';
import {
  determinarPrimerPeriodoPlanificable,
  obtenerPeriodoCurso,
  crearPeriodoRegular,
} from '../rules/academicPeriodRules';
import {
  FACTOR_HORAS_VERANO,
  LIMITE_CREDITOS_VERANO,
  LIMITE_HORAS_PERIODO,
  validarMinimoCreditosElectivos,
} from '../rules/planningRules';
import { calcularImpactoFuturo } from './recommendationService';
import { optimizarSemestre } from './semesterOptimizationService';

export interface CursoPlanificadoResumen {
  codigo: string;
  nombre: string;
  creditos: number;
  impacto: number;
}

export interface CicloPlanificadoResumen {
  /** Compatibilidad: ciclo de referencia del periodo. */
  ciclo: number;
  periodo: PeriodoAcademico;
  creditos: number;
  horasEfectivas: number;
  impacto: number;
  cursos: CursoPlanificadoResumen[];
}

export interface CursoNoPlanificado {
  codigo: string;
  nombre: string;
  motivos: string[];
}

export interface ResultadoPlanificacionAutomatica {
  cursos: Curso[];
  cicloInicio: number;
  cicloFinal: number;
  periodoInicio: PeriodoAcademico;
  limiteCreditos: number;
  limiteCreditosVerano: number;
  totalPlanificados: number;
  ciclos: CicloPlanificadoResumen[];
  noPlanificados: CursoNoPlanificado[];
  explicacion: string[];
}

interface OpcionesPlanificacion {
  limiteCreditos?: number;
  totalCiclos?: number;
  cicloActual?: number | null;
}

const ESTADOS_COMPLETADOS = new Set(['APROBADO', 'CONVALIDADO']);

const determinarTotalCiclos = (cursos: Curso[], configurado?: number): number => {
  const mayorCicloMalla = cursos.reduce(
    (mayor, curso) => Math.max(mayor, curso.cicloOrigen || curso.ciclo || 1),
    1
  );
  return Math.max(configurado ?? 0, mayorCicloMalla);
};

const calcularLimiteDerivado = (cursos: Curso[]): number => {
  const creditosPorCiclo = new Map<number, number>();
  cursos.forEach((curso) => {
    const ciclo = curso.cicloOrigen || curso.ciclo || 1;
    creditosPorCiclo.set(ciclo, (creditosPorCiclo.get(ciclo) ?? 0) + curso.creditos);
  });

  const mayorCarga = Math.max(0, ...creditosPorCiclo.values());
  return mayorCarga;
};

const requisitoCumplidoAntesDe = (
  requisito: Curso,
  periodoDestino: PeriodoAcademico,
  asignaciones: Map<string, PeriodoAcademico>
): boolean => {
  if (ESTADOS_COMPLETADOS.has(requisito.estado)) return true;

  if (requisito.estado === 'EN_CURSO') {
    return obtenerPeriodoCurso(requisito).orden < periodoDestino.orden;
  }

  const periodoAsignado = asignaciones.get(requisito.codigo);
  return periodoAsignado !== undefined && periodoAsignado.orden < periodoDestino.orden;
};

const motivosNoPlanificado = (
  curso: Curso,
  porCodigo: Map<string, Curso>,
  asignaciones: Map<string, PeriodoAcademico>,
  limiteCreditos: number,
  ultimoPeriodo: PeriodoAcademico
): string[] => {
  const motivos: string[] = [];

  if (curso.creditos > limiteCreditos && curso.creditos > LIMITE_CREDITOS_VERANO) {
    motivos.push(
      `El curso requiere ${curso.creditos} créditos y supera los límites disponibles de planificación.`
    );
  }

  curso.prerrequisitos.forEach((codigo) => {
    const requisito = porCodigo.get(codigo);
    if (!requisito) {
      motivos.push(`El prerrequisito ${codigo} no existe en la malla cargada.`);
      return;
    }

    if (ESTADOS_COMPLETADOS.has(requisito.estado)) return;
    if (
      requisito.estado === 'EN_CURSO' &&
      obtenerPeriodoCurso(requisito).orden < ultimoPeriodo.orden + 1
    ) {
      return;
    }
    if (asignaciones.has(requisito.codigo)) return;

    motivos.push(
      `Depende de ${requisito.nombre} (${requisito.codigo}), que no pudo programarse previamente.`
    );
  });

  if (motivos.length === 0) {
    motivos.push(
      'No pudo ubicarse dentro de los periodos disponibles respetando prerrequisitos, horas y límites de créditos.'
    );
  }

  return motivos;
};

/**
 * Genera una ruta determinista únicamente sobre ciclos regulares:
 * Ciclo 1 -> Ciclo 2 -> ... -> Ciclo 10
 *
 * Los periodos de verano no participan en el algoritmo automático.
 *
 * Los cursos APROBADO, CONVALIDADO y EN_CURSO se conservan sin cambios.
 * Los pendientes imposibles permanecen en el banco y se reportan.
 */
export const generarPlanificacionAutomatica = (
  cursosEntrada: Curso[],
  opciones: OpcionesPlanificacion = {}
): ResultadoPlanificacionAutomatica => {
  const cursosBase = cursosEntrada.map((curso) => ({ ...curso }));
  const porCodigo = new Map(cursosBase.map((curso) => [curso.codigo, curso]));
  const cicloFinal = determinarTotalCiclos(cursosBase, opciones.totalCiclos);
  const periodoInicio = opciones.cicloActual
    ? crearPeriodoRegular(opciones.cicloActual + 1)
    : determinarPrimerPeriodoPlanificable(cursosBase);
  const limiteCreditos =
    opciones.limiteCreditos && opciones.limiteCreditos > 0
      ? opciones.limiteCreditos
      : calcularLimiteDerivado(cursosBase);

  // La planificación automática solo considera ciclos regulares.
  // Verano queda disponible únicamente para planificación manual del usuario.
  // El motor automático trabaja únicamente con ciclos regulares.
  // No se generan periodos de verano ni se usan como pasos intermedios.
  // La planificación manual continúa permitiendo verano.
  const periodos = Array.from(
    { length: Math.min(cicloFinal, 12) },
    (_, index) => crearPeriodoRegular(index + 1)
  ).filter((periodo) => periodo.orden >= periodoInicio.orden);
  const ultimoPeriodo = periodos.length > 0 ? periodos[periodos.length - 1] : periodoInicio;

  const pendientes = cursosBase.filter((curso) =>
    curso.estado === 'PENDIENTE' &&
    !(opciones.cicloActual && curso.ubicacion === 'periodo' &&
      obtenerPeriodoCurso(curso).orden < periodoInicio.orden));
  const pendientesRestantes = new Map(pendientes.map((curso) => [curso.codigo, curso]));
  const asignaciones = new Map<string, PeriodoAcademico>();
  const ciclos: CicloPlanificadoResumen[] = [];

  for (const periodo of periodos) {
    if (pendientesRestantes.size === 0) break;

    const maxCreditosPeriodo =
      periodo.tipo === 'VERANO'
        ? Math.min(limiteCreditos, LIMITE_CREDITOS_VERANO)
        : limiteCreditos;

    const disponibles = [...pendientesRestantes.values()].filter((curso) => {
      if (curso.creditos > maxCreditosPeriodo) return false;

      return curso.prerrequisitos.every((codigoPrerequisito) => {
        const requisito = porCodigo.get(codigoPrerequisito);
        if (!requisito) return false;
        return requisitoCumplidoAntesDe(requisito, periodo, asignaciones);
      });
    });

    if (disponibles.length === 0) continue;

    const optimizado = optimizarSemestre(
      disponibles,
      maxCreditosPeriodo,
      cursosBase,
      {
        maxHoras: LIMITE_HORAS_PERIODO,
        factorHoras: periodo.tipo === 'VERANO' ? FACTOR_HORAS_VERANO : 1,
      }
    );

    if (optimizado.cursos.length === 0) continue;

    const resumenCursos = optimizado.cursos.map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      creditos: curso.creditos,
      impacto: calcularImpactoFuturo(curso.codigo, cursosBase),
    }));

    optimizado.cursos.forEach((curso) => {
      asignaciones.set(curso.codigo, periodo);
      pendientesRestantes.delete(curso.codigo);
    });

    ciclos.push({
      ciclo: periodo.cicloReferencia,
      periodo,
      creditos: optimizado.creditos,
      horasEfectivas: optimizado.horas,
      impacto: resumenCursos.reduce((total, curso) => total + curso.impacto, 0),
      cursos: resumenCursos,
    });
  }

  const cursosResultado = cursosBase.map((curso) => {
    if (curso.estado !== 'PENDIENTE') return curso;
    if (opciones.cicloActual && curso.ubicacion === 'periodo' &&
        obtenerPeriodoCurso(curso).orden < periodoInicio.orden) return curso;

    const periodoAsignado = asignaciones.get(curso.codigo);
    if (!periodoAsignado) {
      return {
        ...curso,
        ciclo: curso.cicloOrigen,
        tipoPeriodo: 'REGULAR' as const,
        ubicacion: 'banco' as const,
      };
    }

    return {
      ...curso,
      ciclo: periodoAsignado.cicloReferencia,
      tipoPeriodo: periodoAsignado.tipo,
      ubicacion: 'periodo' as const,
    };
  });

  const noPlanificados = [...pendientesRestantes.values()].map((curso) => ({
    codigo: curso.codigo,
    nombre: curso.nombre,
    motivos: motivosNoPlanificado(
      curso,
      porCodigo,
      asignaciones,
      limiteCreditos,
      ultimoPeriodo
    ),
  }));

  const prioritarios = ciclos
    .flatMap((ciclo) =>
      ciclo.cursos.map((curso) => ({ ...curso, etiquetaPeriodo: ciclo.periodo.etiqueta }))
    )
    .filter((curso) => curso.impacto > 0)
    .sort((a, b) => b.impacto - a.impacto)
    .slice(0, 3);

  const explicacion: string[] = [
    `Se reorganizaron ${asignaciones.size} cursos pendientes usando únicamente ciclos regulares desde ${periodoInicio.etiqueta}, conservando sin cambios los cursos aprobados, convalidados y en curso.`,
    `La ruta solo utiliza ciclos regulares, prioriza materias con mayor cantidad total de descendientes y respeta hasta ${limiteCreditos} créditos por periodo.`,
    `Cada ciclo regular respeta un máximo de ${LIMITE_HORAS_PERIODO} horas efectivas.`,
  ];

  if (prioritarios.length > 0) {
    explicacion.push(
      `Los cursos más estratégicos de la ruta fueron ${prioritarios
        .map((curso) => `${curso.nombre} (${curso.impacto} cursos futuros)`) 
        .join(', ')}.`
    );
  }

  const electivos = validarMinimoCreditosElectivos(cursosBase);
  if (!electivos.valido) {
    explicacion.push(
      `La malla cargada contiene ${electivos.total} créditos electivos; la regla configurada exige al menos ${electivos.limite}.`
    );
  }

  if (noPlanificados.length > 0) {
    explicacion.push(
      `${noPlanificados.length} curso${noPlanificados.length === 1 ? '' : 's'} no pudo${
        noPlanificados.length === 1 ? '' : 'ieron'
      } ubicarse y permanece${noPlanificados.length === 1 ? '' : 'n'} en el banco de pendientes.`
    );
  } else if (pendientes.length > 0) {
    explicacion.push('Todos los cursos pendientes pudieron incorporarse a una ruta válida.');
  }

  return {
    cursos: cursosResultado,
    cicloInicio: periodoInicio.cicloReferencia,
    cicloFinal,
    periodoInicio,
    limiteCreditos,
    limiteCreditosVerano: LIMITE_CREDITOS_VERANO,
    totalPlanificados: asignaciones.size,
    ciclos,
    noPlanificados,
    explicacion,
  };
};
