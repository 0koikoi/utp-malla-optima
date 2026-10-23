import type { Curso, PeriodoAcademico } from '../../types/academic';
import type { Tarifario } from '../../types/financial';
import type { AcademicStore } from '../../store/types';
import electivosAreas from '../../data/universidades/pe-utp/electivosAreas.json';
import { ACADEMIC_LIMITS } from '../../config/academicLimits';
import { obtenerPeriodoCurso } from '../../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual } from '../../domain/rules/academicContextRules';
import { esCursoJalado, estaEnVentana, nombrePeriodoCorto, ventanaJalado } from '../../domain/rules/jaladoRules';
import { calcularHorasEfectivas, MINIMO_CREDITOS_ELECTIVOS, obtenerHorasSinRecargo } from '../../domain/rules/planningRules';
import { calcularPrioridadesPendientes } from '../../domain/services/recommendationService';
import { simularJalado } from '../../domain/services/whatIfService';
import { FinancialPlanningService } from '../../financial/services/FinancialPlanningService';
import { UniversityFinancialRulesProvider } from '../../financial/rules/UniversityFinancialRulesProvider';
import { generateOptimalPlanUseCase } from '../usecases/generateOptimalPlanUseCase';
import type {
  AICarga, AIContext, AICursoPlanificado, AIEscenarioPeriodo, AIFoco, AIFocoContexto, AIWhatIf,
} from './contracts';

/**
 * Contexto del asistente IA. Función PURA: lee el estado del store y devuelve
 * todo ya calculado (créditos, costos, carga, what-if, ruta), para que la IA
 * solo redacte. Copia campos explícitos: nunca nombreArchivoCargado ni otro
 * dato identificable.
 */
export type EstadoContextoIA = Pick<AcademicStore,
  'cursos' | 'tarifario' | 'metodoPago' | 'pagoUnicoPorPeriodo' | 'disciplinaActiva' |
  'periodoIngreso' | 'cicloActual' | 'totalCiclos' | 'ciclosExcluidos'>;

export interface OpcionesContextoIA {
  foco?: AIFoco;
  presupuestoMensual?: number | null;
  servicioFinanciero?: FinancialPlanningService;
}

/** Cursos con longitudCadena desde este valor cuentan como cadena larga en la carga. */
export const LONGITUD_CADENA_LARGA = 3;

const AREAS: Record<string, { area: string; confirmado: boolean }> = electivosAreas;
const COMPLETADOS = new Set(['APROBADO', 'CONVALIDADO']);
const ESCENARIOS = ['sin_descuento', 'interbank_scotiabank', 'bcp_bbva', 'pago_unico'] as const;

const r2 = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const sumar = (cursos: Curso[], campo: 'creditos' | 'horasSemanales') => r2(cursos.reduce((suma, curso) => suma + curso[campo], 0));
const ubicacionDe = (curso: Curso) => curso.ubicacion === 'banco' ? 'banco' : obtenerPeriodoCurso(curso).id;

/** Periodo futuro (no bloqueado por el ciclo actual) donde está planificado el curso, o null. */
const periodoPlanificado = (curso: Curso, cicloActual: number | null): PeriodoAcademico | null => {
  if (curso.estado !== 'PENDIENTE' || curso.ubicacion !== 'periodo') return null;
  const periodo = obtenerPeriodoCurso(curso);
  return cicloActual && periodoBloqueadoPorCicloActual(periodo, cicloActual) ? null : periodo;
};

const agruparPorPeriodo = (cursos: Curso[], cicloActual: number | null) => {
  const grupos = new Map<string, { periodo: PeriodoAcademico; cursos: Curso[] }>();
  for (const curso of cursos) {
    const periodo = periodoPlanificado(curso, cicloActual);
    if (!periodo) continue;
    grupos.set(periodo.id, { periodo, cursos: [...(grupos.get(periodo.id)?.cursos ?? []), curso] });
  }
  return [...grupos.values()].sort((a, b) => a.periodo.orden - b.periodo.orden);
};

const resumenPeriodo = (periodo: PeriodoAcademico, cursos: Curso[]) => ({
  id: periodo.id,
  etiqueta: nombrePeriodoCorto(periodo),
  cursos: cursos.map((curso) => curso.codigo),
  horas: r2(calcularHorasEfectivas(cursos, periodo.tipo)),
  creditos: sumar(cursos, 'creditos'),
});

/**
 * Nivel de carga determinista de un periodo (lo explica la IA, no lo decide):
 *   horas efectivas > límite recomendado (24 h)        → +3
 *   horas > tope de la escala de pensión (22 h)       → +2
 *   horas >= tope de la escala - 2 (desde 20 h)       → +1
 *   cursos de 4 h o más: 5 o más → +2; 3 o 4 → +1
 *   laboratorios: 2 o más                              → +1
 *   cursos con longitudCadena >= 3: 3 o más            → +1
 * nivel = "riesgo" si puntos >= 4 o se superan las 24 h; "atencion" si puntos >= 2; si no, "ok".
 * Sin escala de pensión, el tope es el límite de horas de planificación.
 */
export const calcularCarga = (
  cursos: Curso[], tipo: PeriodoAcademico['tipo'], topeEscala: number | null,
  prioridades: Map<string, { longitudCadena: number }>,
): AICarga => {
  const horas = r2(calcularHorasEfectivas(cursos, tipo));
  const limiteRecomendado = ACADEMIC_LIMITS.horasRecomendadasPeriodo;
  const tope = topeEscala ?? ACADEMIC_LIMITS.horasMaximasPlanificacion;
  const cursos4HorasOMas = cursos.filter((curso) => curso.horasSemanales >= 4).length;
  const laboratorios = cursos.filter((curso) => curso.esLaboratorio).length;
  const cadenasLargas = cursos.filter((curso) =>
    (prioridades.get(curso.codigo)?.longitudCadena ?? 0) >= LONGITUD_CADENA_LARGA).length;

  let puntos = 0;
  const motivos: string[] = [];
  if (horas > limiteRecomendado) {
    puntos += 3;
    motivos.push(`Supera las ${limiteRecomendado} h recomendadas (${horas} h).`);
  } else if (horas > tope) {
    puntos += 2;
    motivos.push(`Supera las ${tope} h de la escala de pensión (${horas} h).`);
  } else if (horas >= tope - 2 && horas > 0) {
    puntos += 1;
    motivos.push(`Está cerca del tope de ${tope} h (${horas} h).`);
  }
  if (cursos4HorasOMas >= 3) {
    puntos += cursos4HorasOMas >= 5 ? 2 : 1;
    motivos.push(`${cursos4HorasOMas} cursos de 4 h o más.`);
  }
  if (laboratorios >= 2) {
    puntos += 1;
    motivos.push(`${laboratorios} cursos con laboratorio.`);
  }
  if (cadenasLargas >= 3) {
    puntos += 1;
    motivos.push(`${cadenasLargas} cursos abren cadenas largas de prerrequisitos.`);
  }
  const nivel = puntos >= 4 || horas > limiteRecomendado ? 'riesgo' : puntos >= 2 ? 'atencion' : 'ok';
  return { nivel, puntos, horas, topeEscala, limiteRecomendado, cursos4HorasOMas, laboratorios, cadenasLargas, motivos };
};

const detalleCursos = (cursos: Curso[], prioridades: Map<string, { impacto: number; longitudCadena: number }>): AICursoPlanificado[] =>
  cursos.map((curso) => ({
    codigo: curso.codigo,
    nombre: curso.nombre,
    creditos: curso.creditos,
    horas: curso.horasSemanales,
    tipo: curso.tipo,
    impacto: prioridades.get(curso.codigo)?.impacto ?? 0,
    longitudCadena: prioridades.get(curso.codigo)?.longitudCadena ?? 0,
    esLaboratorio: Boolean(curso.esLaboratorio),
    jalado: Boolean(curso.jalado),
  }));

const whatIfDe = (codigo: string, cursos: Curso[]): Omit<AIWhatIf, 'origen'> => {
  const simulacion = simularJalado(codigo, cursos);
  return {
    codigo,
    cursosBloqueados: simulacion.cursosBloqueados.map((curso) => curso.codigo),
    planificadosInvalidos: simulacion.planificadosInvalidos.map(({ codigo: afectado, periodoId }) =>
      ({ codigo: afectado, periodoId: periodoId as AIWhatIf['planificadosInvalidos'][number]['periodoId'] })),
  };
};

interface EntornoFinanciero {
  servicio: FinancialPlanningService;
  tarifario: Tarifario;
  estado: EstadoContextoIA;
  presupuesto: number | null;
}

const nombreEscenario = (id: typeof ESCENARIOS[number], tarifario: Tarifario) =>
  id === 'pago_unico'
    ? `Pago único (${tarifario.descuentoPagoUnicoRegular ?? 7.5} % de descuento)`
    : tarifario.metodosPago?.[id]?.nombre ?? id;

const calcularEscenario = (id: typeof ESCENARIOS[number], { servicio, tarifario, estado }: EntornoFinanciero) => {
  const { cursos, disciplinaActiva, cicloActual } = estado;
  const pagoUnico = id === 'pago_unico';
  const periodosRegulares = Object.fromEntries(cursos.filter((curso) => curso.tipoPeriodo === 'REGULAR')
    .map((curso) => [`ciclo-${curso.ciclo}`, true]));
  return servicio.calcular(cursos, tarifario, disciplinaActiva, {
    metodoPago: pagoUnico ? 'sin_descuento' : id,
    pagoUnicoPorPeriodo: pagoUnico ? periodosRegulares : {},
    cicloActual,
  });
};

const escenariosPeriodo = (periodoId: string, entorno: EntornoFinanciero): AIEscenarioPeriodo[] =>
  ESCENARIOS.flatMap((id) => {
    const periodo = calcularEscenario(id, entorno).periodos.find((item) => item.id === periodoId);
    if (!periodo) return [];
    const { resumen } = periodo;
    // En pago único se informa el equivalente mensual del pago de la enseñanza.
    const cuotaMensual = resumen.pagoUnico ? r2(resumen.costoEnsenanzaTotal / resumen.numeroCuotas) : resumen.montoPorCuota;
    return [{
      id,
      nombre: nombreEscenario(id, entorno.tarifario),
      matricula: resumen.costoMatricula,
      numeroCuotas: resumen.numeroCuotas,
      cuotaMensual,
      total: resumen.costoTotalCiclo,
      diferenciaPresupuesto: entorno.presupuesto === null ? null : r2(entorno.presupuesto - cuotaMensual),
    }];
  });

const construirFoco = (
  foco: AIFoco | undefined, estado: EstadoContextoIA, prioridades: Map<string, { impacto: number; longitudCadena: number }>,
  topeEscala: number | null, entorno: EntornoFinanciero | null,
): AIFocoContexto | null => {
  if (!foco) return null;
  if (foco.tipo === 'plan') return { tipo: 'plan' };
  const { cursos, cicloActual } = estado;
  const contextoJalados = { cicloActual, periodoIngreso: estado.periodoIngreso };

  if (foco.tipo === 'ciclo') {
    const grupo = agruparPorPeriodo(cursos, cicloActual).find((item) => item.periodo.id === foco.id);
    if (!grupo) return null;
    return {
      tipo: 'ciclo',
      periodo: resumenPeriodo(grupo.periodo, grupo.cursos),
      cursos: detalleCursos(grupo.cursos, prioridades),
      carga: calcularCarga(grupo.cursos, grupo.periodo.tipo, topeEscala, prioridades),
      escenarios: entorno ? escenariosPeriodo(grupo.periodo.id, entorno) : [],
      jaladosEnVentana: cursos.filter((curso) => esCursoJalado(curso) &&
        ventanaJalado(curso, cursos, contextoJalados).some((periodo) => periodo.id === grupo.periodo.id))
        .map((curso) => curso.codigo),
    };
  }

  const curso = cursos.find((item) => item.codigo === foco.id);
  if (!curso) return null;
  const porCodigo = new Map(cursos.map((item) => [item.codigo, item]));
  return {
    tipo: 'curso',
    codigo: curso.codigo,
    nombre: curso.nombre,
    estado: curso.estado,
    tipoCurso: curso.tipo,
    creditos: curso.creditos,
    horas: curso.horasSemanales,
    ubicacion: ubicacionDe(curso),
    esLaboratorio: Boolean(curso.esLaboratorio),
    jalado: esCursoJalado(curso),
    impacto: prioridades.get(curso.codigo)?.impacto ?? 0,
    longitudCadena: prioridades.get(curso.codigo)?.longitudCadena ?? 0,
    prerrequisitos: curso.prerrequisitos.flatMap((codigo) => {
      const requisito = porCodigo.get(codigo);
      return requisito ? [{ codigo, nombre: requisito.nombre, estado: requisito.estado }] : [];
    }),
    habilitaA: cursos.filter((item) => item.prerrequisitos.includes(curso.codigo)).map((item) => item.codigo),
    whatIf: whatIfDe(curso.codigo, cursos),
    ventanaRecuperacion: esCursoJalado(curso) ? ventanaJalado(curso, cursos, contextoJalados).map((periodo) => periodo.id) : [],
    area: AREAS[curso.codigo]?.area ?? null,
  };
};

export const buildAIContext = (estado: EstadoContextoIA, opciones: OpcionesContextoIA = {}): AIContext => {
  const { cursos, tarifario, disciplinaActiva, cicloActual, periodoIngreso } = estado;
  const contextoJalados = { cicloActual, periodoIngreso };
  const prioridades = calcularPrioridadesPendientes(cursos);
  const topeEscala = obtenerHorasSinRecargo(tarifario, disciplinaActiva);
  const presupuesto = opciones.presupuestoMensual && opciones.presupuestoMensual > 0 ? r2(opciones.presupuestoMensual) : null;
  const entorno: EntornoFinanciero | null = tarifario ? {
    servicio: opciones.servicioFinanciero ?? new FinancialPlanningService(new UniversityFinancialRulesProvider()),
    tarifario, estado, presupuesto,
  } : null;

  const conEstado = (...estados: string[]) => cursos.filter((curso) => estados.includes(curso.estado));
  const electivosCubiertos = sumar(cursos.filter((curso) => curso.tipo === 'ELECTIVO' &&
    (COMPLETADOS.has(curso.estado) || curso.ubicacion === 'periodo')), 'creditos');

  const grupos = agruparPorPeriodo(cursos, cicloActual);
  const siguiente = grupos[0];
  const cursosProximos = siguiente?.cursos ?? [];
  const financieroProximo = siguiente && entorno
    ? calcularEscenario('sin_descuento', entorno).periodos.find((item) => item.id === siguiente.periodo.id) : undefined;

  const ruta = (() => {
    const propuesta = generateOptimalPlanUseCase({
      cursos, totalCiclos: estado.totalCiclos, ciclosExcluidos: estado.ciclosExcluidos, cicloActual, periodoIngreso,
    });
    const periodos = agruparPorPeriodo(propuesta.cursos, cicloActual);
    const cicloFinal = periodos.length ? Math.max(...periodos.map((item) => item.periodo.cicloReferencia)) : null;
    return {
      propuesta: periodos.map((item) => ({ periodoId: item.periodo.id, cursos: item.cursos.map((curso) => curso.codigo) })),
      ciclosRestantes: cicloFinal && cicloActual ? Math.max(0, cicloFinal - cicloActual) : periodos.length,
      cicloFinal,
      noPlanificados: propuesta.noPlanificados.map((curso) => curso.codigo),
    };
  })();

  const metodo = tarifario?.metodosPago?.[estado.metodoPago];
  const tarifas = tarifario ? tarifario.disciplinas[disciplinaActiva] ?? Object.values(tarifario.disciplinas)[0] : undefined;

  return {
    version: 1,
    perfil: {
      periodoIngreso,
      cicloActual,
      totalCiclos: estado.totalCiclos,
      disciplina: disciplinaActiva,
      creditos: {
        aprobados: sumar(conEstado('APROBADO', 'CONVALIDADO'), 'creditos'),
        enCurso: sumar(conEstado('EN_CURSO'), 'creditos'),
        pendientes: sumar(conEstado('PENDIENTE'), 'creditos'),
      },
      electivos: {
        cubiertos: electivosCubiertos,
        minimo: MINIMO_CREDITOS_ELECTIVOS,
        faltantes: r2(Math.max(0, MINIMO_CREDITOS_ELECTIVOS - electivosCubiertos)),
      },
    },
    catalogo: cursos.map((curso) => ({
      codigo: curso.codigo, nombre: curso.nombre, estado: curso.estado, tipo: curso.tipo,
      creditos: curso.creditos, ubicacion: ubicacionDe(curso),
    })),
    periodosPlanificados: grupos.map((grupo) => resumenPeriodo(grupo.periodo, grupo.cursos)),
    proximoPeriodo: siguiente ? {
      id: siguiente.periodo.id,
      etiqueta: nombrePeriodoCorto(siguiente.periodo),
      cursos: detalleCursos(cursosProximos, prioridades),
      totalHoras: r2(calcularHorasEfectivas(cursosProximos, siguiente.periodo.tipo)),
      totalCreditos: sumar(cursosProximos, 'creditos'),
      horasExceso: financieroProximo?.resumen.horasExceso ?? 0,
    } : null,
    jalados: cursos.filter(esCursoJalado).map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      ventana: ventanaJalado(curso, cursos, contextoJalados).map((periodo) => periodo.id),
      ubicacionActual: ubicacionDe(curso),
      enVentana: estaEnVentana(curso, cursos, contextoJalados),
    })),
    financiero: entorno && tarifario ? {
      moneda: tarifario.moneda,
      referencia: `Tarifario ${tarifario.tarifarioVersion ?? ''} ${tarifario.sede ?? ''}`.replace(/\s+/g, ' ').trim() + ' (referencial)',
      metodoPagoElegido: { id: estado.metodoPago, nombre: metodo?.nombre ?? estado.metodoPago },
      costoHoraAdicional: tarifas?.costoHoraAdicional ?? null,
      presupuestoMensual: presupuesto,
      proximoPeriodo: siguiente ? escenariosPeriodo(siguiente.periodo.id, entorno) : [],
      planCompleto: ESCENARIOS.map((id) => ({
        id, nombre: nombreEscenario(id, tarifario), total: r2(calcularEscenario(id, entorno).totalGeneral),
      })),
    } : null,
    carga: calcularCarga(cursosProximos, siguiente?.periodo.tipo ?? 'REGULAR', topeEscala, prioridades),
    whatIf: [
      ...conEstado('EN_CURSO').map((curso) => ({ ...whatIfDe(curso.codigo, cursos), origen: 'EN_CURSO' as const })),
      ...cursosProximos.map((curso) => ({ ...whatIfDe(curso.codigo, cursos), origen: 'PROXIMO_PERIODO' as const })),
    ],
    ruta,
    electivos: cursos.filter((curso) => curso.tipo === 'ELECTIVO' && curso.estado === 'PENDIENTE').map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      creditos: curso.creditos,
      horas: curso.horasSemanales,
      area: AREAS[curso.codigo]?.area ?? null,
      areaConfirmada: AREAS[curso.codigo]?.confirmado ?? false,
      ubicacion: ubicacionDe(curso),
    })),
    limites: { ...ACADEMIC_LIMITS, topeEscalaPension: topeEscala },
    foco: construirFoco(opciones.foco, estado, prioridades, topeEscala, entorno),
  };
};
