import type {
  AIAnalisisResponse, AIChatResponse, AIContext, AIRequest, AIRespuesta, AISeccion, Nivel,
} from './contracts.js';

/**
 * Respuestas simuladas del asistente, armadas con los datos reales del
 * contexto (cursos, montos, carga, what-if, ventana de jalados). Las usan el
 * proxy sin clave de DeepSeek y el cliente local en desarrollo.
 * ai-proxy/src/mockRespuestas.ts es una copia exacta; un test falla si difieren.
 */

const soles = (monto: number) => {
  const [entero, decimales] = Math.abs(monto).toFixed(2).split('.');
  return `${monto < 0 ? '-' : ''}S/ ${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
};
const horas = (valor: number) => `${valor} h`;
const periodo = (id: string) => id.replace(/^ciclo-/, 'Ciclo ').replace(/^verano-/, 'Verano ');
const listar = (items: string[]) => items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items.at(-1)}` : items.join('');

const nombreDe = (contexto: AIContext, codigo: string) =>
  contexto.catalogo.find((curso) => curso.codigo === codigo)?.nombre ?? codigo;
const conCodigo = (contexto: AIContext, codigo: string) => `${nombreDe(contexto, codigo)} (${codigo})`;

const PREGUNTAS_BASE = ['¿Me alcanza mi presupuesto?', '¿Estoy sobrecargado?', '¿Qué electivo me conviene?'];

const seccionFinanciera = (contexto: AIContext): AISeccion | null => {
  const financiero = contexto.financiero;
  const escenarios = financiero?.proximoPeriodo ?? [];
  if (!financiero || !escenarios.length || !contexto.proximoPeriodo) return null;
  const elegido = escenarios.find((item) => item.id === financiero.metodoPagoElegido.id) ?? escenarios[0];
  const mejor = [...escenarios].sort((a, b) => a.total - b.total)[0];
  const diferencia = elegido.diferenciaPresupuesto;
  const nivel: Nivel = diferencia !== null && diferencia < 0 ? 'riesgo'
    : contexto.proximoPeriodo.horasExceso > 0 ? 'atencion' : 'ok';
  const partes = [
    `En el ${contexto.proximoPeriodo.etiqueta} pagarías ${soles(elegido.total)} (${elegido.nombre}): matrícula de ${soles(elegido.matricula)} y ${elegido.numeroCuotas} cuotas de ${soles(elegido.cuotaMensual)}.`,
  ];
  if (mejor.id !== elegido.id) partes.push(`La opción más barata es ${mejor.nombre}: ${soles(mejor.total)}.`);
  if (contexto.proximoPeriodo.horasExceso > 0 && financiero.costoHoraAdicional !== null) {
    partes.push(`Tienes ${horas(contexto.proximoPeriodo.horasExceso)} sobre la escala; cada hora adicional cuesta ${soles(financiero.costoHoraAdicional)} por cuota.`);
  }
  if (diferencia !== null) {
    partes.push(diferencia < 0
      ? `Tu presupuesto de ${soles(financiero.presupuestoMensual!)} no cubre la cuota: te faltan ${soles(-diferencia)} al mes.`
      : `Tu presupuesto de ${soles(financiero.presupuestoMensual!)} cubre la cuota y te sobran ${soles(diferencia)} al mes.`);
  } else {
    partes.push('Si me dices tu presupuesto mensual, te digo si te alcanza.');
  }
  partes.push('Montos referenciales: verifícalos en el portal de la UTP antes de pagar.');
  const acciones = [
    ...(mejor.id !== elegido.id ? [`Evalúa pagar con ${mejor.nombre}.`] : []),
    ...(contexto.proximoPeriodo.horasExceso > 0 ? ['Quita horas para no pagar recargo.'] : []),
    ...(diferencia === null ? ['Ingresa tu presupuesto mensual.'] : []),
  ].slice(0, 3);
  return { tipo: 'financiero', nivel, titulo: 'Costo del próximo periodo', detalle: partes.join(' '), acciones, cursos: [] };
};

const seccionCarga = (contexto: AIContext): AISeccion => {
  const { carga, proximoPeriodo } = contexto;
  const pesados = (proximoPeriodo?.cursos ?? []).filter((curso) => curso.horas >= 4).map((curso) => curso.codigo);
  const detalle = !proximoPeriodo
    ? 'Aún no tienes cursos planificados para el próximo periodo.'
    : `${proximoPeriodo.etiqueta}: ${horas(carga.horas)} y ${proximoPeriodo.totalCreditos} créditos. ${carga.motivos.join(' ') || 'La carga está dentro de lo recomendado.'}`;
  const acciones = carga.nivel === 'ok'
    ? ['Mantén un horario fijo de estudio.']
    : ['Mueve un curso de 4 h a otro periodo.', 'Reserva tiempo para los cursos largos.', 'Revisa la ruta antes de matricularte.'];
  const titulo = carga.nivel === 'riesgo' ? 'Carga muy alta' : carga.nivel === 'atencion' ? 'Carga exigente' : 'Carga equilibrada';
  return { tipo: 'carga', nivel: carga.nivel, titulo, detalle, acciones: acciones.slice(0, 3), cursos: pesados };
};

const seccionRuta = (contexto: AIContext): AISeccion => {
  const { ruta } = contexto;
  const primeros = ruta.propuesta.slice(0, 2)
    .map((item) => `${periodo(item.periodoId)}: ${item.cursos.length} cursos`).join('; ');
  const pendientes = ruta.noPlanificados.map((codigo) => conCodigo(contexto, codigo));
  const detalle = ruta.cicloFinal
    ? `Con la propuesta del planificador terminarías en el Ciclo ${ruta.cicloFinal} (${ruta.ciclosRestantes} ciclos más). ${primeros}.`
    : 'No quedan cursos por planificar.';
  return {
    tipo: 'ruta',
    nivel: pendientes.length ? 'atencion' : 'ok',
    titulo: 'Tu ruta hasta egresar',
    detalle: pendientes.length ? `${detalle} Quedan sin ubicar: ${listar(pendientes)}.` : detalle,
    acciones: ['Revisa la propuesta en Estrategia.', ...(pendientes.length ? ['Agrega un ciclo para ubicar lo pendiente.'] : [])],
    cursos: [...(ruta.propuesta[0]?.cursos.slice(0, 4) ?? []), ...ruta.noPlanificados].slice(0, 6),
  };
};

const seccionWhatIf = (contexto: AIContext): AISeccion | null => {
  const fuera = contexto.jalados.filter((jalado) => !jalado.enVentana);
  if (contexto.jalados.length) {
    const textos = contexto.jalados.map((jalado) =>
      `${jalado.nombre} (${jalado.codigo}) debe ir en ${listar(jalado.ventana.map(periodo))}${jalado.enVentana ? ' y ya está ahí' : ''}.`);
    return {
      tipo: 'whatIf',
      nivel: fuera.length ? 'riesgo' : 'atencion',
      titulo: fuera.length ? 'Tienes un curso jalado por ubicar' : 'Curso jalado en su ventana',
      detalle: `${textos.join(' ')}${fuera.length ? ' Mientras no esté en su ventana, no puedes matricular otros cursos.' : ''}`,
      acciones: fuera.length ? ['Lleva el jalado a su ventana de recuperación.'] : ['Prioriza aprobar el curso jalado.'],
      cursos: contexto.jalados.map((jalado) => jalado.codigo),
    };
  }
  const critico = [...contexto.whatIf].sort((a, b) => b.cursosBloqueados.length - a.cursosBloqueados.length)[0];
  if (!critico) return null;
  const total = critico.cursosBloqueados.length;
  return {
    tipo: 'whatIf',
    nivel: total >= 3 ? 'atencion' : 'ok',
    titulo: 'Curso que más te conviene asegurar',
    detalle: total
      ? `Si jalas ${conCodigo(contexto, critico.codigo)}, se bloquean ${total} cursos, entre ellos ${listar(critico.cursosBloqueados.slice(0, 3).map((codigo) => nombreDe(contexto, codigo)))}.`
      : 'Ningún curso actual bloquea a otros si lo jalas.',
    acciones: total ? [`Dale prioridad a ${nombreDe(contexto, critico.codigo)}.`] : [],
    cursos: [critico.codigo, ...critico.cursosBloqueados.slice(0, 3)],
  };
};

const seccionElectivos = (contexto: AIContext): AISeccion => {
  const { electivos } = contexto.perfil;
  const opciones = contexto.electivos.map((electivo) =>
    `${electivo.nombre} (${electivo.codigo}, ${electivo.creditos} créditos${electivo.area ? `, ${electivo.area}` : ''})`);
  return {
    tipo: 'electivos',
    nivel: electivos.faltantes > 0 ? 'atencion' : 'ok',
    titulo: electivos.faltantes > 0 ? `Te faltan ${electivos.faltantes} créditos electivos` : 'Electivos cubiertos',
    detalle: electivos.faltantes > 0 && opciones.length
      ? `Necesitas ${electivos.minimo} créditos electivos y llevas ${electivos.cubiertos}. Disponibles: ${listar(opciones)}. Las áreas son referenciales.`
      : `Llevas ${electivos.cubiertos} de ${electivos.minimo} créditos electivos.`,
    acciones: electivos.faltantes > 0 ? ['Elige el electivo según tu interés.', 'Prefiere uno de pocas horas si tu ciclo está cargado.'] : [],
    cursos: contexto.electivos.map((electivo) => electivo.codigo),
  };
};

export const mockAnalisis = (contexto: AIContext): AIAnalisisResponse => {
  const secciones = [seccionFinanciera(contexto), seccionCarga(contexto), seccionRuta(contexto),
    seccionWhatIf(contexto), seccionElectivos(contexto)].filter((seccion): seccion is AISeccion => seccion !== null);
  const riesgos = secciones.filter((seccion) => seccion.nivel === 'riesgo').map((seccion) => seccion.titulo.toLowerCase());
  const resumen = riesgos.length
    ? `Revisé tu plan. Hay ${riesgos.length === 1 ? 'un punto' : `${riesgos.length} puntos`} de riesgo: ${listar(riesgos)}.`
    : 'Revisé tu plan y se ve ordenado. Te dejo los detalles por tema.';
  return { resumen, secciones, preguntasSugeridas: PREGUNTAS_BASE };
};

type Tema = 'financiero' | 'carga' | 'whatIf' | 'ruta' | 'electivos' | 'conviene' | 'fuera';

const detectarTema = (texto: string): Tema => {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/presupuesto|alcanza|cuesta|costo|pagar|cuota|precio|pension|descuento|plata|dinero/.test(t)) return 'financiero';
  if (/jal|desaprueb|repruebo/.test(t)) return 'whatIf';
  if (/sobrecarg|carga|horas|pesado|cansad/.test(t)) return 'carga';
  if (/electivo/.test(t)) return 'electivos';
  if (/ruta|egresar|terminar|acabar|ciclos me faltan|graduar/.test(t)) return 'ruta';
  if (/conviene|llevarlo|ahora|matricul|ciclo|curso|plan/.test(t)) return 'conviene';
  return 'fuera';
};

const respuestaCurso = (contexto: AIContext, tema: Tema): AIChatResponse | null => {
  const foco = contexto.foco;
  if (foco?.tipo !== 'curso') return null;
  const nombre = `${foco.nombre} (${foco.codigo})`;
  const preguntas = ['¿Qué pasa si lo jalo?', '¿Me conviene llevarlo ahora?', '¿Cuánto me cuesta?'];
  if (tema === 'whatIf') {
    const bloqueados = foco.whatIf.cursosBloqueados;
    return {
      texto: bloqueados.length
        ? `Si jalas ${nombre}, se bloquean ${bloqueados.length} cursos: ${listar(bloqueados.map((codigo) => nombreDe(contexto, codigo)))}.\nTendrías que llevarlo en su ventana de recuperación antes de seguir.`
        : `Si jalas ${nombre}, no se bloquea ningún otro curso, pero igual debes llevarlo en su ventana de recuperación.`,
      cursos: [foco.codigo, ...bloqueados], preguntasSugeridas: preguntas.filter((_, indice) => indice !== 0),
    };
  }
  if (tema === 'financiero') {
    const escenarios = contexto.proximoPeriodo?.id === foco.ubicacion ? contexto.financiero?.proximoPeriodo ?? [] : [];
    return {
      texto: escenarios.length
        ? `${nombre} está en el ${periodo(foco.ubicacion)}. Ese periodo cuesta ${soles(escenarios[0].total)} sin descuento.\nEn la escala UTP pagas por horas del periodo, no por curso: este curso suma ${horas(foco.horas)}.`
        : `En la escala UTP pagas por horas del periodo, no por curso. ${nombre} suma ${horas(foco.horas)}; planifícalo en un ciclo para ver el costo.`,
      cursos: [foco.codigo], preguntasSugeridas: preguntas.slice(0, 2),
    };
  }
  return {
    texto: `${nombre} tiene ${foco.creditos} créditos y ${horas(foco.horas)}. Desbloquea ${foco.impacto} cursos y abre una cadena de ${foco.longitudCadena}.\n` +
      (foco.impacto >= 2 ? 'Te conviene llevarlo pronto para no retrasar tu ruta.' : 'No es crítico: puedes acomodarlo según tu carga.'),
    cursos: [foco.codigo, ...foco.habilitaA.slice(0, 3)], preguntasSugeridas: [preguntas[0], preguntas[2]],
  };
};

const desdeSeccion = (seccion: AISeccion | null, preguntas: string[]): AIChatResponse => seccion
  ? { texto: `${seccion.detalle}${seccion.acciones.length ? `\n${seccion.acciones.map((accion) => `• ${accion}`).join('\n')}` : ''}`, cursos: seccion.cursos, preguntasSugeridas: preguntas }
  : { texto: 'No tengo ese dato en tu plan todavía. Planifica tus cursos y vuelve a preguntarme.', cursos: [], preguntasSugeridas: preguntas };

export const mockChat = (contexto: AIContext, pregunta: string): AIChatResponse => {
  const tema = detectarTema(pregunta);
  if (tema === 'fuera') {
    return { texto: 'Solo puedo ayudarte con la planificación de tu matrícula y su costo.', cursos: [], preguntasSugeridas: PREGUNTAS_BASE };
  }
  const deCurso = respuestaCurso(contexto, tema);
  if (deCurso) return deCurso;
  const otras = (excluir: string) => ['¿Me alcanza mi presupuesto?', '¿Estoy sobrecargado?', '¿Qué pasa si jalo un curso?', '¿Qué electivo me conviene?']
    .filter((item) => !item.toLowerCase().includes(excluir)).slice(0, 3);
  switch (tema) {
    case 'financiero': return desdeSeccion(seccionFinanciera(contexto), otras('presupuesto'));
    case 'carga': return desdeSeccion(seccionCarga(contexto), otras('sobrecargado'));
    case 'whatIf': return desdeSeccion(seccionWhatIf(contexto), otras('jalo'));
    case 'electivos': return desdeSeccion(seccionElectivos(contexto), otras('electivo'));
    case 'ruta': return desdeSeccion(seccionRuta(contexto), otras('ruta'));
    default: {
      if (contexto.foco?.tipo === 'ciclo') {
        const { periodo: resumen, carga, escenarios } = contexto.foco;
        return {
          texto: `${resumen.etiqueta}: ${resumen.cursos.length} cursos, ${horas(carga.horas)} y ${resumen.creditos} créditos. Nivel de carga: ${carga.nivel}.` +
            (escenarios[0] ? `\nCuesta ${soles(escenarios[0].total)} sin descuento.` : ''),
          cursos: resumen.cursos, preguntasSugeridas: ['¿Estoy sobrecargado?', '¿Me alcanza mi presupuesto?'],
        };
      }
      return desdeSeccion(seccionCarga(contexto), otras('sobrecargado'));
    }
  }
};

/** Respuesta simulada según el modo; el chat responde al último mensaje del usuario. */
export const generarRespuestaMock = (peticion: AIRequest): AIRespuesta => {
  if (peticion.modo === 'analisis') return mockAnalisis(peticion.contexto);
  const ultima = [...peticion.mensajes].reverse().find((mensaje) => mensaje.rol === 'user');
  return mockChat(peticion.contexto, ultima?.texto ?? '');
};
