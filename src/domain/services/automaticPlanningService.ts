import type { Curso } from '../../types/academic';
import { calcularImpactoFuturo } from './recommendationService';
import { optimizarSemestre } from './semesterOptimizationService';

export interface CursoPlanificadoResumen {
  codigo: string;
  nombre: string;
  creditos: number;
  impacto: number;
}

export interface CicloPlanificadoResumen {
  ciclo: number;
  creditos: number;
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
  limiteCreditos: number;
  totalPlanificados: number;
  ciclos: CicloPlanificadoResumen[];
  noPlanificados: CursoNoPlanificado[];
  explicacion: string[];
}

interface OpcionesPlanificacion {
  limiteCreditos?: number;
  totalCiclos?: number;
}

const ESTADOS_COMPLETADOS = new Set(['APROBADO', 'CONVALIDADO']);

const determinarTotalCiclos = (cursos: Curso[], configurado?: number): number => {
  const mayorCicloMalla = cursos.reduce(
    (mayor, curso) => Math.max(mayor, curso.cicloOrigen || curso.ciclo || 1),
    1
  );
  return Math.max(configurado ?? 0, mayorCicloMalla);
};

/**
 * La planificación comienza después del ciclo que el estudiante está cursando.
 * Si no existe EN_CURSO, se toma como referencia el último ciclo que contiene
 * al menos un curso aprobado. Las convalidaciones aisladas no adelantan por sí
 * solas el punto de inicio del estudiante.
 */
const determinarCicloInicio = (cursos: Curso[]): number => {
  const enCurso = cursos.filter((curso) => curso.estado === 'EN_CURSO');
  if (enCurso.length > 0) {
    return Math.max(...enCurso.map((curso) => curso.ciclo)) + 1;
  }

  const aprobados = cursos.filter((curso) => curso.estado === 'APROBADO');
  if (aprobados.length > 0) {
    return Math.max(...aprobados.map((curso) => curso.ciclo)) + 1;
  }

  return 1;
};

const calcularLimiteDerivado = (cursos: Curso[]): number => {
  const creditosPorCiclo = new Map<number, number>();
  cursos.forEach((curso) => {
    const ciclo = curso.cicloOrigen || curso.ciclo || 1;
    creditosPorCiclo.set(ciclo, (creditosPorCiclo.get(ciclo) ?? 0) + curso.creditos);
  });

  const mayorCarga = Math.max(0, ...creditosPorCiclo.values());
  return mayorCarga > 0 ? mayorCarga : 22;
};

const requisitoCumplidoAntesDe = (
  requisito: Curso,
  cicloDestino: number,
  asignaciones: Map<string, number>
): boolean => {
  if (ESTADOS_COMPLETADOS.has(requisito.estado)) return true;
  if (requisito.estado === 'EN_CURSO') return requisito.ciclo < cicloDestino;

  const cicloAsignado = asignaciones.get(requisito.codigo);
  return cicloAsignado !== undefined && cicloAsignado < cicloDestino;
};

const motivosNoPlanificado = (
  curso: Curso,
  porCodigo: Map<string, Curso>,
  asignaciones: Map<string, number>,
  limiteCreditos: number,
  cicloInicio: number,
  cicloFinal: number
): string[] => {
  const motivos: string[] = [];

  if (cicloInicio > cicloFinal) {
    motivos.push('No quedan ciclos disponibles dentro de la malla para ubicar este curso.');
  }

  if (curso.creditos > limiteCreditos) {
    motivos.push(
      `El curso requiere ${curso.creditos} créditos y supera el límite de ${limiteCreditos} créditos por ciclo.`
    );
  }

  curso.prerrequisitos.forEach((codigo) => {
    const requisito = porCodigo.get(codigo);
    if (!requisito) {
      motivos.push(`El prerrequisito ${codigo} no existe en la malla cargada.`);
      return;
    }

    if (ESTADOS_COMPLETADOS.has(requisito.estado)) return;
    if (requisito.estado === 'EN_CURSO' && requisito.ciclo < cicloFinal + 1) return;
    if (asignaciones.has(requisito.codigo)) return;

    motivos.push(
      `Depende de ${requisito.nombre} (${requisito.codigo}), que no pudo programarse previamente.`
    );
  });

  if (motivos.length === 0) {
    motivos.push(
      'No pudo ubicarse dentro de los ciclos disponibles respetando prerrequisitos y límite de créditos.'
    );
  }

  return motivos;
};

/**
 * Genera una ruta académica determinista para todos los cursos PENDIENTE.
 * Los cursos aprobados, convalidados y en curso se conservan sin cambios.
 * Los pendientes que no puedan ubicarse permanecen en el banco y se reportan.
 */
export const generarPlanificacionAutomatica = (
  cursosEntrada: Curso[],
  opciones: OpcionesPlanificacion = {}
): ResultadoPlanificacionAutomatica => {
  const cursosBase = cursosEntrada.map((curso) => ({ ...curso }));
  const porCodigo = new Map(cursosBase.map((curso) => [curso.codigo, curso]));
  const cicloFinal = determinarTotalCiclos(cursosBase, opciones.totalCiclos);
  const cicloInicio = determinarCicloInicio(cursosBase);
  const limiteCreditos =
    opciones.limiteCreditos && opciones.limiteCreditos > 0
      ? opciones.limiteCreditos
      : calcularLimiteDerivado(cursosBase);

  const pendientes = cursosBase.filter((curso) => curso.estado === 'PENDIENTE');
  const pendientesRestantes = new Map(pendientes.map((curso) => [curso.codigo, curso]));
  const asignaciones = new Map<string, number>();
  const ciclos: CicloPlanificadoResumen[] = [];

  for (let ciclo = cicloInicio; ciclo <= cicloFinal && pendientesRestantes.size > 0; ciclo += 1) {
    const disponibles = [...pendientesRestantes.values()].filter((curso) => {
      if (curso.creditos > limiteCreditos) return false;

      return curso.prerrequisitos.every((codigoPrerequisito) => {
        const requisito = porCodigo.get(codigoPrerequisito);
        if (!requisito) return false;
        return requisitoCumplidoAntesDe(requisito, ciclo, asignaciones);
      });
    });

    if (disponibles.length === 0) continue;

    const optimizado = optimizarSemestre(disponibles, limiteCreditos, cursosBase);
    if (optimizado.cursos.length === 0) continue;

    const resumenCursos = optimizado.cursos.map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      creditos: curso.creditos,
      impacto: calcularImpactoFuturo(curso.codigo, cursosBase),
    }));

    optimizado.cursos.forEach((curso) => {
      asignaciones.set(curso.codigo, ciclo);
      pendientesRestantes.delete(curso.codigo);
    });

    ciclos.push({
      ciclo,
      creditos: optimizado.creditos,
      impacto: resumenCursos.reduce((total, curso) => total + curso.impacto, 0),
      cursos: resumenCursos,
    });
  }

  const cursosResultado = cursosBase.map((curso) => {
    if (curso.estado !== 'PENDIENTE') return curso;

    const cicloAsignado = asignaciones.get(curso.codigo);
    if (cicloAsignado === undefined) {
      return {
        ...curso,
        ciclo: curso.cicloOrigen,
        ubicacion: 'banco' as const,
      };
    }

    return {
      ...curso,
      ciclo: cicloAsignado,
      ubicacion: 'ciclo' as const,
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
      cicloInicio,
      cicloFinal
    ),
  }));

  const prioritarios = ciclos
    .flatMap((ciclo) => ciclo.cursos.map((curso) => ({ ...curso, ciclo: ciclo.ciclo })))
    .filter((curso) => curso.impacto > 0)
    .sort((a, b) => b.impacto - a.impacto)
    .slice(0, 3);

  const explicacion: string[] = [
    `Se reorganizaron ${asignaciones.size} cursos pendientes a partir del ciclo ${cicloInicio}, conservando sin cambios los cursos aprobados, convalidados y en curso.`,
    `La ruta prioriza las materias con mayor cantidad total de descendientes y respeta un máximo de ${limiteCreditos} créditos por ciclo.`,
  ];

  if (prioritarios.length > 0) {
    explicacion.push(
      `Los cursos más estratégicos de la ruta fueron ${prioritarios
        .map((curso) => `${curso.nombre} (${curso.impacto} cursos futuros)`)
        .join(', ')}.`
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
    cicloInicio,
    cicloFinal,
    limiteCreditos,
    totalPlanificados: asignaciones.size,
    ciclos,
    noPlanificados,
    explicacion,
  };
};
