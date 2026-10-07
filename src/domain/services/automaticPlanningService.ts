import { formatCredits } from '../../utils/formatCredits';
import type { Curso, PeriodoAcademico, PeriodoIngreso } from '../../types/academic';
import { determinarPeriodoEnCurso, obtenerPeriodoCurso, crearPeriodoRegular } from '../rules/academicPeriodRules';
import { LIMITE_HORAS_PLANIFICACION, LIMITE_HORAS_PERIODO, calcularHorasEfectivas } from '../rules/planningRules';
import { calcularPrioridadesPendientes } from './recommendationService';
import { optimizarSemestre } from './semesterOptimizationService';
import { determinarTotalCiclos, normalizarTotalCiclos, normalizarCiclosExcluidos, obtenerCiclosDisponibles } from '../rules/cycleRules';
import { obtenerAsignacionesConservadas } from './preservedPlanningAssignments';
import { periodoBloqueadoPorCicloActual } from '../rules/academicContextRules';

export interface CursoPlanificadoResumen {
  codigo: string;
  nombre: string;
  creditos: number;
  impacto: number;
}

export interface CicloPlanificadoResumen {
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
  limiteHoras: number;
  totalPlanificados: number;
  totalConservados: number;
  ciclos: CicloPlanificadoResumen[];
  noPlanificados: CursoNoPlanificado[];
  explicacion: string[];
  advertenciasHoras: { periodo: PeriodoAcademico; total: number; limite: number }[];
}

interface OpcionesPlanificacion {
  totalCiclos?: number;
  ciclosExcluidos?: number[];
  cicloActual?: number | null;
  periodoIngreso?: PeriodoIngreso | null;
}

const ESTADOS_COMPLETADOS = new Set(['APROBADO', 'CONVALIDADO']);
const horasValidas = (curso: Curso) => Number.isFinite(curso.horasSemanales) && curso.horasSemanales > 0;

const requisitoCumplidoAntesDe = (
  requisito: Curso, destino: PeriodoAcademico, asignaciones: Map<string, PeriodoAcademico>
): boolean => {
  if (ESTADOS_COMPLETADOS.has(requisito.estado)) return true;
  if (requisito.estado === 'EN_CURSO' && requisito.ubicacion === 'periodo') {
    return obtenerPeriodoCurso(requisito).orden < destino.orden;
  }
  const asignacion = asignaciones.get(requisito.codigo);
  return asignacion !== undefined && asignacion.orden < destino.orden;
};

/** Las referencias externas no bloquean; los requisitos presentes sí se validan. */
const prerrequisitosCumplidos = (
  curso: Curso, destino: PeriodoAcademico, porCodigo: Map<string, Curso>, asignaciones: Map<string, PeriodoAcademico>
): boolean => curso.prerrequisitos.every((codigo) => {
  const requisito = porCodigo.get(codigo);
  return !requisito || requisitoCumplidoAntesDe(requisito, destino, asignaciones);
});

const tieneDependenciaCircular = (codigo: string, cursos: Map<string, Curso>): boolean => {
  const resultado = new Map<string, boolean>();
  const recorrer = (actual: string, camino: Set<string>): boolean => {
    if (camino.has(actual)) return true;
    if (resultado.has(actual)) return resultado.get(actual)!;
    const curso = cursos.get(actual);
    if (!curso || curso.estado !== 'PENDIENTE') return false;
    const circular = curso.prerrequisitos.some((requisito) =>
      recorrer(requisito, new Set([...camino, actual])));
    resultado.set(actual, circular);
    return circular;
  };
  return recorrer(codigo, new Set());
};

const motivosNoPlanificado = (
  curso: Curso, porCodigo: Map<string, Curso>, asignaciones: Map<string, PeriodoAcademico>,
  ultimoPeriodo: PeriodoAcademico | undefined, cicloFinal: number
): string[] => {
  const motivos: string[] = [];
  if (!horasValidas(curso)) motivos.push('El curso no tiene una cantidad válida de horas semanales. Revisa el archivo importado.');
  if (!ultimoPeriodo) motivos.push('No hay ciclos regulares futuros en el rango elegido.');
  if (tieneDependenciaCircular(curso.codigo, porCodigo)) motivos.push('Existe una dependencia circular en sus prerrequisitos.');
  for (const codigo of curso.prerrequisitos) {
    const requisito = porCodigo.get(codigo);
    if (requisito && ultimoPeriodo && !requisitoCumplidoAntesDe(requisito, ultimoPeriodo, asignaciones)) {
      const periodo = asignaciones.get(codigo);
      motivos.push(periodo
        ? `${requisito.nombre} está en ${periodo.etiqueta}; no queda un ciclo posterior disponible para este curso.`
        : `Depende de ${requisito.nombre} (${codigo}), que no está programado válidamente en un periodo anterior.`);
    }
  }
  if (motivos.length === 0) {
    motivos.push(`No encontró espacio hasta el ciclo ${cicloFinal}, respetando prerrequisitos y las ${LIMITE_HORAS_PLANIFICACION} horas por ciclo. Puedes añadir ciclos o ajustar la distribución manual.`);
  }
  return motivos;
};

/**
 * Reorganiza únicamente pendientes en ciclos regulares desde el siguiente al actual.
 * Conserva el historial, la matrícula en curso y los veranos manuales obligatorios válidos.
 * Selecciona como máximo un electivo para colocarlo al final de los obligatorios.
 */
export const generarPlanificacionAutomatica = (
  cursosEntrada: Curso[], opciones: OpcionesPlanificacion = {}
): ResultadoPlanificacionAutomatica => {
  const cursosBase = cursosEntrada.map((curso) => ({ ...curso }));
  const porCodigo = new Map(cursosBase.map((curso) => [curso.codigo, curso]));
  if (porCodigo.size !== cursosBase.length) throw new Error('La malla contiene códigos de curso duplicados.');
  const actualDetectado = determinarPeriodoEnCurso(cursosBase)?.cicloReferencia ?? 0;
  const cicloActual = opciones.cicloActual && Number.isFinite(opciones.cicloActual)
    ? normalizarTotalCiclos(opciones.cicloActual) : actualDetectado;
  const cicloInicio = cicloActual + 1;
  const periodoInicio = crearPeriodoRegular(cicloInicio);
  const cicloFinal = determinarTotalCiclos(cursosBase, opciones.totalCiclos);
  const ciclosExcluidos = normalizarCiclosExcluidos(opciones.ciclosExcluidos);
  for (const curso of cursosBase) {
    if (curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo' &&
        curso.tipoPeriodo === 'REGULAR' && ciclosExcluidos.includes(curso.ciclo)) {
      curso.ciclo = curso.cicloOrigen;
      curso.ubicacion = 'banco';
    }
  }
  const electivoCubierto = cursosBase.some((curso) => curso.tipo === 'ELECTIVO' &&
    (ESTADOS_COMPLETADOS.has(curso.estado) || curso.estado === 'EN_CURSO' ||
      curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo' && cicloActual > 0 &&
      periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual)));
  const electivos = cursosBase.filter((curso) => curso.tipo === 'ELECTIVO' && curso.estado === 'PENDIENTE')
    .sort((a, b) => (horasValidas(a) ? a.horasSemanales : Infinity) - (horasValidas(b) ? b.horasSemanales : Infinity) ||
      b.creditos - a.creditos || a.codigo.localeCompare(b.codigo));
  const electivoElegido = electivoCubierto ? undefined : electivos[0];
  // Solo se recalculan pendientes futuros; el historial y los bloques cerrados se conservan.
  for (const curso of electivos) {
    if (curso.ubicacion === 'periodo' && cicloActual > 0 &&
        periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual)) continue;
    curso.ciclo = curso.cicloOrigen;
    curso.tipoPeriodo = 'REGULAR';
    curso.ubicacion = 'banco';
  }
  const periodos = obtenerCiclosDisponibles(cicloFinal, ciclosExcluidos).map(crearPeriodoRegular)
    .filter((periodo) => periodo.cicloReferencia >= cicloInicio);
  const ultimoPeriodo = periodos.at(-1);
  const { conservados, asignaciones } = obtenerAsignacionesConservadas(cursosBase, cicloActual, opciones.periodoIngreso);
  const pendientes = cursosBase.filter((curso) => curso.estado === 'PENDIENTE' &&
    curso.tipo !== 'ELECTIVO' && !conservados.has(curso.codigo));
  const restantes = new Map(pendientes.map((curso) => [curso.codigo, curso]));
  const nuevasAsignaciones = new Map<string, PeriodoAcademico>();
  const ciclos: CicloPlanificadoResumen[] = [];

  for (const periodo of periodos) {
    if (restantes.size === 0) break;
    const cargaConservada = cursosBase.filter((curso) => curso.ubicacion === 'periodo' &&
      (curso.estado === 'EN_CURSO' || (curso.estado === 'PENDIENTE' && conservados.has(curso.codigo))) &&
      obtenerPeriodoCurso(curso).id === periodo.id);
    if (cargaConservada.some((curso) => !horasValidas(curso))) continue;
    let horasDisponibles = Math.max(0, LIMITE_HORAS_PLANIFICACION - calcularHorasEfectivas(cargaConservada, 'REGULAR'));
    const prioridades = calcularPrioridadesPendientes([...restantes.values()]);
    const disponibles = [...restantes.values()].filter((curso) => horasValidas(curso) &&
      prerrequisitosCumplidos(curso, periodo, porCodigo, asignaciones));
    const grupos = [
      disponibles.filter((curso) => (prioridades.get(curso.codigo)?.impacto ?? 0) > 0)
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
      disponibles.filter((curso) => (prioridades.get(curso.codigo)?.impacto ?? 0) === 0 && curso.cicloOrigen <= cicloActual)
        .sort((a, b) => a.cicloOrigen - b.cicloOrigen || a.codigo.localeCompare(b.codigo)),
      disponibles.filter((curso) => (prioridades.get(curso.codigo)?.impacto ?? 0) === 0 && curso.cicloOrigen > cicloActual)
        .sort((a, b) => a.cicloOrigen - b.cicloOrigen || a.codigo.localeCompare(b.codigo)),
    ];
    const seleccionados: Curso[] = [];
    for (const grupo of grupos) {
      const seleccion = optimizarSemestre(grupo, horasDisponibles, prioridades);
      seleccionados.push(...seleccion.cursos);
      horasDisponibles -= seleccion.horas;
    }
    if (seleccionados.length === 0) continue;
    for (const curso of seleccionados) {
      nuevasAsignaciones.set(curso.codigo, periodo);
      asignaciones.set(curso.codigo, periodo);
      restantes.delete(curso.codigo);
    }
    const cursosPeriodo = [...cargaConservada, ...seleccionados];
    ciclos.push({
      ciclo: periodo.cicloReferencia, periodo,
      creditos: cursosPeriodo.reduce((suma, curso) => suma + curso.creditos, 0),
      horasEfectivas: calcularHorasEfectivas(cursosPeriodo, 'REGULAR'),
      impacto: seleccionados.reduce((suma, curso) => suma + (prioridades.get(curso.codigo)?.impacto ?? 0), 0),
      cursos: seleccionados.map((curso) => ({
        codigo: curso.codigo, nombre: curso.nombre, creditos: curso.creditos,
        impacto: prioridades.get(curso.codigo)?.impacto ?? 0,
      })),
    });
  }

  // El único electivo se coloca al final de los obligatorios, sin desplazar ninguno.
  if (electivoElegido && restantes.size === 0 && horasValidas(electivoElegido)) {
    const ultimaOrdenObligatoria = cursosBase.reduce((orden, curso) => {
      if (curso.tipo === 'ELECTIVO') return orden;
      const periodo = nuevasAsignaciones.get(curso.codigo) ??
        (curso.ubicacion === 'periodo' && (curso.estado === 'EN_CURSO' || conservados.has(curso.codigo))
          ? obtenerPeriodoCurso(curso) : undefined);
      return periodo ? Math.max(orden, periodo.orden) : orden;
    }, periodoInicio.orden);
    for (const periodo of periodos) {
      if (periodo.orden < ultimaOrdenObligatoria ||
          !prerrequisitosCumplidos(electivoElegido, periodo, porCodigo, asignaciones)) continue;
      const carga = cursosBase.filter((curso) => {
        if (curso.estado !== 'PENDIENTE' && curso.estado !== 'EN_CURSO') return false;
        const asignado = nuevasAsignaciones.get(curso.codigo) ??
          (curso.ubicacion === 'periodo' && (curso.estado === 'EN_CURSO' || conservados.has(curso.codigo))
            ? obtenerPeriodoCurso(curso) : undefined);
        return asignado?.id === periodo.id;
      });
      if (carga.some((curso) => !horasValidas(curso)) ||
          calcularHorasEfectivas(carga, 'REGULAR') + electivoElegido.horasSemanales > LIMITE_HORAS_PLANIFICACION) continue;
      nuevasAsignaciones.set(electivoElegido.codigo, periodo);
      asignaciones.set(electivoElegido.codigo, periodo);
      const resumen = { codigo: electivoElegido.codigo, nombre: electivoElegido.nombre,
        creditos: electivoElegido.creditos, impacto: 0 };
      const ciclo = ciclos.find((ciclo) => ciclo.periodo.id === periodo.id);
      if (ciclo) {
        ciclo.cursos.push(resumen);
        ciclo.creditos += electivoElegido.creditos;
        ciclo.horasEfectivas += electivoElegido.horasSemanales;
      } else {
        ciclos.push({ ciclo: periodo.cicloReferencia, periodo,
          creditos: carga.reduce((total, curso) => total + curso.creditos, electivoElegido.creditos),
          horasEfectivas: calcularHorasEfectivas(carga, 'REGULAR') + electivoElegido.horasSemanales,
          impacto: 0, cursos: [resumen] });
      }
      break;
    }
  }

  const cursos = cursosBase.map((curso) => {
    if (curso.estado !== 'PENDIENTE' || conservados.has(curso.codigo)) return curso;
    const periodo = nuevasAsignaciones.get(curso.codigo);
    return { ...curso, ciclo: periodo?.cicloReferencia ?? curso.cicloOrigen,
      tipoPeriodo: 'REGULAR' as const, ubicacion: periodo ? 'periodo' as const : 'banco' as const };
  });
  const noPlanificados = [...restantes.values()].map((curso) => ({
    codigo: curso.codigo, nombre: curso.nombre,
    motivos: motivosNoPlanificado(curso, porCodigo, asignaciones, ultimoPeriodo, cicloFinal),
  }));
  if (electivoElegido && !nuevasAsignaciones.has(electivoElegido.codigo)) {
    noPlanificados.push({ codigo: electivoElegido.codigo, nombre: electivoElegido.nombre,
      motivos: restantes.size > 0
        ? ['El electivo queda en el banco hasta que puedan planificarse todos los obligatorios.']
        : motivosNoPlanificado(electivoElegido, porCodigo, asignaciones, ultimoPeriodo, cicloFinal) });
  }
  const explicacion = [
    `Se organizaron ${nuevasAsignaciones.size} cursos pendientes desde el ciclo ${cicloInicio} hasta el ${cicloFinal}, utilizando solo ciclos regulares.`,
    `Cada ciclo que recibe nuevas asignaciones respeta hasta ${LIMITE_HORAS_PLANIFICACION} horas semanales. Los créditos son informativos y no limitan la propuesta.`,
    'Primero se organizan todos los obligatorios: se priorizan los que desbloquean más obligatorios pendientes y se completa el espacio con materias de ciclos anteriores o del actual, y después de ciclos posteriores.',
    'Los aprobados y convalidados solo se consultan para resolver prerrequisitos; no aportan carga ni prioridad. Los cursos en curso se conservan.',
    'Los prerrequisitos cuyos códigos no existen en la malla se omiten; los existentes deben cumplirse en un periodo anterior.',
  ];
  if (ciclosExcluidos.some((ciclo) => ciclo <= cicloFinal)) explicacion.push(`Los ciclos retirados (${ciclosExcluidos.filter((ciclo) => ciclo <= cicloFinal).join(', ')}) no reciben asignaciones automáticas.`);
  if (electivoElegido) explicacion.push(`Se eligió un solo electivo: ${electivoElegido.nombre} (${electivoElegido.horasSemanales} h, ${formatCredits(electivoElegido.creditos)} cr). Se selecciona por menos horas y, en empate, más créditos. Se coloca al final de los obligatorios si cabe; los demás electivos quedan en el banco como alternativas.`);
  else if (electivoCubierto) explicacion.push('Ya hay un electivo aprobado, convalidado, en curso o en un bloque cerrado. No se añaden electivos adicionales.');
  if (conservados.size) explicacion.push(`Se conservaron ${conservados.size} pendientes con asignaciones cerradas o vinculadas a veranos manuales válidos. Sus prerrequisitos y cargas se consideran al planificar.`);
  if (noPlanificados.length) explicacion.push(`${noPlanificados.length} cursos permanecen en el banco. Revisa los motivos indicados para cada curso.`);
  else if (pendientes.length || electivoElegido) explicacion.push('Se planificaron todos los obligatorios que podían reorganizarse y el electivo seleccionado, cuando era necesario.');

  const cargas = new Map<string, { periodo: PeriodoAcademico; cursos: Curso[] }>();
  cursos.filter((curso) => curso.ubicacion === 'periodo' && (curso.estado === 'PENDIENTE' || curso.estado === 'EN_CURSO'))
    .forEach((curso) => {
      const periodo = obtenerPeriodoCurso(curso);
      const carga = cargas.get(periodo.id) ?? { periodo, cursos: [] };
      carga.cursos.push(curso);
      cargas.set(periodo.id, carga);
    });
  const advertenciasHoras = [...cargas.values()]
    .filter(({ periodo }) => periodo.cicloReferencia > cicloActual || periodo.tipo === 'VERANO' && periodo.cicloReferencia === cicloActual)
    .map(({ periodo, cursos }) => ({ periodo, total: calcularHorasEfectivas(cursos, periodo.tipo), limite: LIMITE_HORAS_PERIODO }))
    .filter(({ total, limite }) => total > limite);
  if (advertenciasHoras.length) explicacion.push('Algunas asignaciones manuales conservadas superan las 24 horas recomendadas; se mantienen y se muestran como advertencia.');
  return { cursos, cicloInicio, cicloFinal, periodoInicio, limiteHoras: LIMITE_HORAS_PLANIFICACION,
    totalPlanificados: nuevasAsignaciones.size, totalConservados: conservados.size,
    ciclos, noPlanificados, explicacion, advertenciasHoras };
};

/** Verifica la carga real de los ciclos modificados antes de guardar la propuesta. */
export const validarCargaPlanificacionAutomatica = (resultado: ResultadoPlanificacionAutomatica): void => {
  for (const ciclo of resultado.ciclos) {
    const carga = resultado.cursos.filter((curso) => curso.ubicacion === 'periodo' &&
      (curso.estado === 'PENDIENTE' || curso.estado === 'EN_CURSO') && obtenerPeriodoCurso(curso).id === ciclo.periodo.id);
    if (ciclo.periodo.tipo !== 'REGULAR' || carga.some((curso) => !horasValidas(curso)) ||
        calcularHorasEfectivas(carga, 'REGULAR') > LIMITE_HORAS_PLANIFICACION) {
      throw new Error(`La propuesta supera las ${LIMITE_HORAS_PLANIFICACION} horas o contiene una carga inválida en ${ciclo.periodo.etiqueta}. Genera una propuesta nueva.`);
    }
  }
};
