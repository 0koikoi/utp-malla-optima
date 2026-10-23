import type { Curso, PeriodoAcademico } from '../../../types/academic';
import { determinarPeriodoEnCurso, obtenerPeriodoCurso, crearPeriodoRegular } from '../../rules/academicPeriodRules';
import { LIMITE_HORAS_PLANIFICACION, LIMITE_HORAS_PERIODO, calcularHorasEfectivas, validarLimiteCreditosVerano } from '../../rules/planningRules';
import { calcularPrioridadesPendientes } from '../recommendationService';
import { optimizarSemestre } from '../semesterOptimizationService';
import { determinarTotalCiclos, normalizarTotalCiclos, normalizarCiclosExcluidos, obtenerCiclosDisponibles } from '../../rules/cycleRules';
import { obtenerAsignacionesConservadas } from '../preservedPlanningAssignments';
import { periodoBloqueadoPorCicloActual } from '../../rules/academicContextRules';
import { esJaladoSinReplanificar } from '../../rules/courseRules';
import { esCursoJalado, nombrePeriodoCorto, ventanaDesdeCiclo } from '../../rules/jaladoRules';
import { prerrequisitosCumplidos } from './prerequisiteChecks';
import { horasValidas, motivosNoPlanificado } from './unplannedReasons';
import type { CicloPlanificadoResumen, ExplicacionPlan, OpcionesPlanificacion, ResultadoPlanificacionAutomatica } from './types';

const ESTADOS_COMPLETADOS = new Set(['APROBADO', 'CONVALIDADO']);

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
  // Regla UTP: los jalados van primero, en el PRIMER periodo de su ventana (el verano si
  // existe). Si el verano ya no admite sus créditos, van al ciclo regular de la ventana.
  const ventana = cicloActual > 0 ? ventanaDesdeCiclo(cicloActual, opciones) : [];
  const jalados = ventana.length ? cursosBase.filter(esCursoJalado) : [];
  const destinoJalado = new Map<string, PeriodoAcademico>();
  for (const curso of jalados) {
    const destino = ventana.find((periodo) => periodo.tipo === 'REGULAR' ||
      validarLimiteCreditosVerano([...cursosBase.filter((item) => item !== curso && item.estado === 'PENDIENTE' &&
        item.ubicacion === 'periodo' && obtenerPeriodoCurso(item).id === periodo.id), curso]).valido)!;
    destinoJalado.set(curso.codigo, destino);
    curso.ciclo = destino.cicloReferencia;
    curso.tipoPeriodo = destino.tipo;
    curso.ubicacion = 'periodo';
  }
  const electivoCubierto = cursosBase.some((curso) => curso.tipo === 'ELECTIVO' &&
    (ESTADOS_COMPLETADOS.has(curso.estado) || curso.estado === 'EN_CURSO' || esCursoJalado(curso) ||
      curso.estado === 'PENDIENTE' && curso.ubicacion === 'periodo' && cicloActual > 0 &&
      !esJaladoSinReplanificar(curso, cicloActual) &&
      periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual)));
  const electivos = cursosBase.filter((curso) => curso.tipo === 'ELECTIVO' && curso.estado === 'PENDIENTE' &&
    !esCursoJalado(curso))
    .sort((a, b) => (horasValidas(a) ? a.horasSemanales : Infinity) - (horasValidas(b) ? b.horasSemanales : Infinity) ||
      b.creditos - a.creditos || a.codigo.localeCompare(b.codigo));
  const electivoElegido = electivoCubierto ? undefined : electivos[0];
  // Solo se recalculan pendientes futuros; el historial y los bloques cerrados se conservan.
  for (const curso of electivos) {
    if (curso.ubicacion === 'periodo' && cicloActual > 0 && !esJaladoSinReplanificar(curso, cicloActual) &&
        periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual)) continue;
    curso.ciclo = curso.cicloOrigen;
    curso.tipoPeriodo = 'REGULAR';
    curso.ubicacion = 'banco';
  }
  const periodos = obtenerCiclosDisponibles(cicloFinal, ciclosExcluidos).map(crearPeriodoRegular)
    .filter((periodo) => periodo.cicloReferencia >= cicloInicio);
  const ultimoPeriodo = periodos.at(-1);
  const { conservados, asignaciones } = obtenerAsignacionesConservadas(cursosBase, cicloActual, opciones.periodoIngreso);
  const nuevasAsignaciones = new Map<string, PeriodoAcademico>();
  for (const curso of jalados) {
    conservados.add(curso.codigo);
    asignaciones.set(curso.codigo, destinoJalado.get(curso.codigo)!);
    nuevasAsignaciones.set(curso.codigo, destinoJalado.get(curso.codigo)!);
  }
  const pendientes = cursosBase.filter((curso) => curso.estado === 'PENDIENTE' &&
    curso.tipo !== 'ELECTIVO' && !conservados.has(curso.codigo));
  const restantes = new Map(pendientes.map((curso) => [curso.codigo, curso]));
  const ciclos: CicloPlanificadoResumen[] = [];
  // El verano de la ventana solo recibe jalados: se resume antes de los ciclos regulares.
  for (const periodo of ventana.filter((item) => item.tipo === 'VERANO')) {
    const carga = cursosBase.filter((curso) => curso.ubicacion === 'periodo' && conservados.has(curso.codigo) &&
      obtenerPeriodoCurso(curso).id === periodo.id);
    const jaladosVerano = carga.filter(esCursoJalado);
    if (!jaladosVerano.length) continue;
    ciclos.push({ ciclo: periodo.cicloReferencia, periodo,
      creditos: carga.reduce((suma, curso) => suma + curso.creditos, 0),
      horasEfectivas: calcularHorasEfectivas(carga, 'VERANO'), impacto: 0,
      cursos: jaladosVerano.map((curso) => ({ codigo: curso.codigo, nombre: curso.nombre, creditos: curso.creditos, impacto: 0 })) });
  }

  for (const periodo of periodos) {
    if (restantes.size === 0 && ![...destinoJalado.values()].some((destino) => destino.id === periodo.id)) break;
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
    const jaladosPeriodo = cargaConservada.filter(esCursoJalado);
    if (seleccionados.length === 0 && jaladosPeriodo.length === 0) continue;
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
      cursos: [...jaladosPeriodo, ...seleccionados].map((curso) => ({
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
        ? [{ tipo: 'ELECTIVO_ESPERA_OBLIGATORIOS' as const }]
        : motivosNoPlanificado(electivoElegido, porCodigo, asignaciones, ultimoPeriodo, cicloFinal) });
  }
  const explicacion: ExplicacionPlan[] = [
    { tipo: 'RESUMEN', total: nuevasAsignaciones.size, cicloInicio, cicloFinal,
      jaladosEnVerano: [...destinoJalado.values()].filter((destino) => destino.tipo === 'VERANO').length },
    { tipo: 'LIMITE', horas: LIMITE_HORAS_PLANIFICACION },
    { tipo: 'PRIORIDAD_OBLIGATORIOS' },
    { tipo: 'APROBADOS_SIN_CARGA' },
    { tipo: 'REQUISITOS_EXTERNOS' },
  ];
  const excluidos = ciclosExcluidos.filter((ciclo) => ciclo <= cicloFinal);
  if (excluidos.length) explicacion.push({ tipo: 'CICLOS_EXCLUIDOS', ciclos: excluidos });
  if (electivoElegido) explicacion.push({ tipo: 'ELECTIVO_ELEGIDO', curso: electivoElegido });
  else if (electivoCubierto) explicacion.push({ tipo: 'ELECTIVO_CUBIERTO' });
  // Los jalados se fijan en su ventana de recuperación, pero no son asignaciones conservadas del estudiante.
  const totalConservados = conservados.size - jalados.length;
  if (jalados.length) explicacion.push({ tipo: 'JALADOS_PRIMERO', total: jalados.length,
    periodos: [...new Map([...destinoJalado.values()].sort((a, b) => a.orden - b.orden)
      .map((destino) => [destino.id, nombrePeriodoCorto(destino)])).values()] });
  if (totalConservados) explicacion.push({ tipo: 'CONSERVADOS', total: totalConservados });
  if (noPlanificados.length) explicacion.push({ tipo: 'PENDIENTES', total: noPlanificados.length });
  else if (pendientes.length || electivoElegido) explicacion.push({ tipo: 'COMPLETADOS' });

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
  if (advertenciasHoras.length) explicacion.push({ tipo: 'ADVERTENCIAS_HORAS', horas: LIMITE_HORAS_PERIODO });
  return { cursos, cicloInicio, cicloFinal, periodoInicio, limiteHoras: LIMITE_HORAS_PLANIFICACION,
    totalPlanificados: nuevasAsignaciones.size, totalConservados,
    ciclos, noPlanificados, explicacion, advertenciasHoras };
};

