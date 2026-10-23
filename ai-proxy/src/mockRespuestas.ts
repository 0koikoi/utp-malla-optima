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

/** "en el Ciclo 9" o "en el Verano 8 o en el Ciclo 9"; sin ventana conocida, "en su ventana de recuperación". */
const enVentana = (ventana: string[]) =>
  ventana.length ? `en el ${ventana.map(periodo).join(' o en el ')}` : 'en su ventana de recuperación';

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
      ? `Si jalas ${conCodigo(contexto, critico.codigo)}, se bloquean ${total} cursos, entre ellos ${listar(critico.cursosBloqueados.slice(0, 3).map((codigo) => nombreDe(contexto, codigo)))}. Tendrías que llevarlo ${enVentana(critico.ventanaSiJala)}.`
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

type Tema = 'bienestar' | 'identidad' | 'sinDatos' | 'intentos' | 'cachimbo'
  | 'financiero' | 'carga' | 'whatIf' | 'ruta' | 'electivos' | 'conviene' | 'fuera';

const normalizar = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Palabras del glosario del prompt: la jerga es un espejo, solo se usa si el alumno la usó. */
const JERGA = /\b(bika|trika|tranca|yuca|huecos?|cachimbos?|chamba|matri|cruces?|profes?|full)\b/;
export const usaJerga = (texto: string) => JERGA.test(normalizar(texto));

const detectarTema = (texto: string): Tema => {
  const t = normalizar(texto);
  if (/estres|no puedo mas|dejar la (u|carrera|universidad)|quiero dejar|agobi|ansios/.test(t)) return 'bienestar';
  if (/eres (una |un )?(persona|humano|profe|profesor|docente|real)|hablo con (una persona|alguien)/.test(t)) return 'identidad';
  if (/horario|hueco|cruce|seccion|profe|docente|\bnotas?\b|tranca|yuca|dificil/.test(t)) return 'sinDatos';
  if (/\bbika\b|\btrika\b|(segunda|tercera) vez|(dos|tres|2|3) veces/.test(t)) return 'intentos';
  if (/cachimbo|primer ciclo/.test(t)) return 'cachimbo';
  if (/presupuesto|alcanza|cuesta|costo|pagar|pago|cuota|precio|pension|descuento|plata|dinero|matricula/.test(t)) return 'financiero';
  if (/jal|desaprueb|repruebo/.test(t)) return 'whatIf';
  if (/sobrecarg|carga|cargo|horas|pesado|cansad|chamba|trabaj/.test(t)) return 'carga';
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
        ? `Si jalas ${nombre}, se bloquean ${bloqueados.length} cursos: ${listar(bloqueados.map((codigo) => nombreDe(contexto, codigo)))}.\nTendrías que llevarlo ${enVentana(foco.whatIf.ventanaSiJala)} antes de seguir.`
        : `Si jalas ${nombre}, no se bloquea ningún otro curso, pero igual tendrías que llevarlo ${enVentana(foco.whatIf.ventanaSiJala)}.`,
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

/** Curso del catálogo cuyo nombre aparece en la pregunta, o el curso en foco. */
const cursoMencionado = (contexto: AIContext, pregunta: string) => {
  const t = normalizar(pregunta);
  const porNombre = [...contexto.catalogo].sort((a, b) => b.nombre.length - a.nombre.length)
    .find((curso) => t.includes(normalizar(curso.nombre)));
  if (porNombre) return porNombre;
  const foco = contexto.foco;
  return foco?.tipo === 'curso' ? contexto.catalogo.find((curso) => curso.codigo === foco.codigo) ?? null : null;
};

/** Ventana del curso: la de CONTEXTO.jalados si ya está jalado; si no, la de su what-if. */
const ventanaDe = (contexto: AIContext, codigo: string) =>
  contexto.jalados.find((jalado) => jalado.codigo === codigo)?.ventana
  ?? contexto.whatIf.find((item) => item.codigo === codigo)?.ventanaSiJala
  ?? (contexto.foco?.tipo === 'curso' && contexto.foco.codigo === codigo ? contexto.foco.ventanaRecuperacion : []);

const cargaEnUnaFrase = (contexto: AIContext) => contexto.proximoPeriodo
  ? `Tu ${contexto.proximoPeriodo.etiqueta} suma ${horas(contexto.carga.horas)} y su nivel de carga es ${contexto.carga.nivel}.`
  : 'Todavía no tienes cursos planificados para el próximo periodo.';

const respuestaBienestar = (contexto: AIContext): AIChatResponse => ({
  texto: 'Lo que sientes es válido, y no tienes que cargar con todo sin ayuda: busca apoyo en tutoría o en bienestar universitario de la UTP, para eso están.\n' +
    `En lo práctico, ${cargaEnUnaFrase(contexto).replace(/^T/, 't')} Si quieres, vemos juntos qué curso mover para alivianar ese periodo.`,
  cursos: [],
  preguntasSugeridas: ['¿Qué curso me conviene dejar para después?', '¿Estoy sobrecargado?'],
});

const respuestaIdentidad = (): AIChatResponse => ({
  texto: 'Soy una IA: el asesor académico de MallaU. No soy una persona ni personal de la UTP, pero te ayudo a ordenar tu plan con los datos que cargaste.',
  cursos: [],
  preguntasSugeridas: PREGUNTAS_BASE,
});

/** Regla 7: MallaU no tiene horarios, secciones, profesores, notas ni dificultad real. */
const respuestaSinDatos = (contexto: AIContext, pregunta: string): AIChatResponse => {
  const t = normalizar(pregunta);
  const falta = /profe|docente/.test(t) ? 'información de los profesores'
    : /\bnotas?\b/.test(t) ? 'tus notas'
      : /tranca|yuca|dificil/.test(t) ? 'datos de la dificultad real de los cursos'
        : 'los horarios ni las secciones';
  const cursos = contexto.proximoPeriodo?.cursos ?? [];
  const masHoras = [...cursos].sort((a, b) => b.horas - a.horas)[0];
  const ofrezco = masHoras
    ? `Lo que sí veo es la carga en horas: en el ${contexto.proximoPeriodo!.etiqueta} el curso con más horas es ${masHoras.nombre} (${masHoras.codigo}), con ${horas(masHoras.horas)}, y el periodo suma ${horas(contexto.carga.horas)}.`
    : 'Lo que sí puedo es decirte qué cursos llevar, en qué orden y cuántas horas suman.';
  return {
    texto: `Eso no lo tengo: MallaU no tiene ${falta}. ${ofrezco} ¿Te ayudo con eso?`,
    cursos: masHoras ? [masHoras.codigo] : [],
    preguntasSugeridas: ['¿Qué cursos llevo el próximo ciclo?', '¿Estoy sobrecargado?'],
  };
};

/** Regla 8: bika o trika solo si el alumno lo dice; la ley se cita sin jerga. */
const respuestaIntentos = (contexto: AIContext, pregunta: string): AIChatResponse => {
  const t = normalizar(pregunta);
  const curso = cursoMencionado(contexto, pregunta);
  const nombre = curso ? `${curso.nombre} (${curso.codigo})` : 'ese curso';
  if (/\btrika\b|tercera vez|(tres|3) veces/.test(t)) {
    return {
      texto: `Sé que es un momento difícil y está bien sentirlo. Según la Ley Universitaria 30220 (art. 102), desaprobar la misma materia por tercera vez lleva a una separación temporal de un año, y una cuarta desaprobación, al retiro definitivo. La UTP puede tener reglas propias, así que habla con tu tutor o con Servicios Académicos antes de la matrícula para saber exactamente cómo aplica en tu caso con ${nombre}.`,
      cursos: curso ? [curso.codigo] : [],
      preguntasSugeridas: ['¿Qué cursos llevo el próximo ciclo?', '¿Estoy sobrecargado?'],
    };
  }
  return {
    texto: `Con ${nombre}, el próximo intento es clave: según la Ley Universitaria 30220 (art. 102), desaprobar la misma materia por tercera vez lleva a una separación temporal de un año.\n` +
      `• Dale prioridad y llévalo ${curso ? enVentana(ventanaDe(contexto, curso.codigo)) : 'en su ventana de recuperación'}.\n` +
      '• Lleva menos carga ese periodo.\n• Pide tutoría o asesoría antes de matricularte.',
    cursos: curso ? [curso.codigo] : [],
    preguntasSugeridas: ['¿Qué curso me conviene dejar para después?', '¿Estoy sobrecargado?'],
  };
};

/** El alumno dice ser de primer ciclo, pero el contexto dice otra cosa: se le hace notar con amabilidad. */
const respuestaCachimbo = (contexto: AIContext, pregunta: string): AIChatResponse | null => {
  const ciclo = contexto.perfil.cicloActual;
  if (ciclo === null || ciclo <= 1) return null;
  const jerga = usaJerga(pregunta);
  return {
    texto: `Veo en tu plan que vas en el Ciclo ${ciclo}, así que ${jerga ? 'ya no serías cachimbo' : 'no estarías en primer ciclo'}. ¿Quizás falta actualizar tu ciclo actual? Revísalo en la configuración y te ayudo con lo que sigue.`,
    cursos: [],
    preguntasSugeridas: ['¿Qué cursos llevo el próximo ciclo?', '🗺️ Mi ruta hasta egresar'],
  };
};

export const mockChat = (contexto: AIContext, pregunta: string): AIChatResponse => {
  const tema = detectarTema(pregunta);
  if (tema === 'fuera') {
    return {
      texto: 'Solo puedo ayudarte con la planificación de tu matrícula y su costo. ¿Vemos qué cursos te tocan el próximo ciclo?',
      cursos: [], preguntasSugeridas: PREGUNTAS_BASE,
    };
  }
  if (tema === 'bienestar') return respuestaBienestar(contexto);
  if (tema === 'identidad') return respuestaIdentidad();
  if (tema === 'sinDatos') return respuestaSinDatos(contexto, pregunta);
  if (tema === 'intentos') return respuestaIntentos(contexto, pregunta);
  if (tema === 'cachimbo') {
    const incoherente = respuestaCachimbo(contexto, pregunta);
    if (incoherente) return incoherente;
  }
  const jalado = cursoMencionado(contexto, pregunta);
  const comoJalado = jalado && contexto.jalados.find((item) => item.codigo === jalado.codigo);
  if (comoJalado) {
    // Regla 3: un jalado nunca se posterga.
    return {
      texto: `No: ${comoJalado.nombre} (${comoJalado.codigo}) está jalado y tiene que ir ${enVentana(comoJalado.ventana)}.` +
        `${comoJalado.enVentana ? ' Ya lo tienes ahí, así que vas bien.' : ' Mientras no esté en su ventana, no puedes matricular otros cursos.'}\n` +
        '¿Es la primera vez que lo jalas? Así te doy el consejo correcto.',
      cursos: [comoJalado.codigo],
      preguntasSugeridas: ['¿Qué cursos llevo el próximo ciclo?', '¿Estoy sobrecargado?'],
    };
  }
  const deCurso = respuestaCurso(contexto, tema);
  if (deCurso) return deCurso;
  const otras = (excluir: string) => ['¿Me alcanza mi presupuesto?', '¿Estoy sobrecargado?', '¿Qué pasa si jalo un curso?', '¿Qué electivo me conviene?']
    .filter((item) => !item.toLowerCase().includes(excluir)).slice(0, 3);
  const trabaja = /trabaj|chamba/.test(normalizar(pregunta));
  const focoCiclo = contexto.foco?.tipo === 'ciclo' ? contexto.foco : null;
  switch (tema) {
    case 'financiero': {
      if (focoCiclo?.escenarios.length) {
        const [base, ...otrosMetodos] = focoCiclo.escenarios;
        const masBarato = [...otrosMetodos].sort((a, b) => a.total - b.total)[0];
        return {
          texto: `El ${focoCiclo.periodo.etiqueta} cuesta ${soles(base.total)} (${base.nombre}): matrícula de ${soles(base.matricula)} y ${base.numeroCuotas} cuotas de ${soles(base.cuotaMensual)}.` +
            (masBarato && masBarato.total < base.total ? ` Con ${masBarato.nombre} pagarías ${soles(masBarato.total)}.` : '') +
            ' Son montos referenciales: verifícalos en el portal de la UTP antes de pagar.',
          cursos: [], preguntasSugeridas: otras('presupuesto'),
        };
      }
      const respuesta = desdeSeccion(seccionFinanciera(contexto), otras('presupuesto'));
      // Otro monto en la pregunta: no se recalcula; se usa el presupuesto del plan y se explica cómo cambiarlo.
      return /\d{3,}/.test(pregunta) && contexto.financiero?.presupuestoMensual !== null
        ? { ...respuesta, texto: `Uso el presupuesto que tienes en tu plan; si quieres probar con otro monto, cámbialo en tu presupuesto mensual y vuelve a preguntarme.\n${respuesta.texto}` }
        : respuesta;
    }
    case 'carga': {
      const respuesta = desdeSeccion(seccionCarga(contexto), otras('sobrecargado'));
      if (!trabaja) return respuesta;
      // Regla 9: matiza el consejo sin cambiar los números; la jerga solo si el alumno la usó.
      const consejo = usaJerga(pregunta)
        ? 'Si estás con mucha chamba, te conviene llevar menos horas este periodo y asegurar los cursos que abren tu ruta.'
        : 'Si trabajas, te conviene llevar menos horas este periodo y asegurar los cursos que abren tu ruta.';
      return { ...respuesta, texto: `${respuesta.texto}\n${consejo}` };
    }
    case 'whatIf': {
      // Regla 8: nunca se asume cuántas veces lo jaló.
      if (!/jale|jalaste|jalado/.test(normalizar(pregunta))) return desdeSeccion(seccionWhatIf(contexto), otras('jalo'));
      if (!contexto.jalados.length) {
        return {
          texto: 'Lo siento, pero tiene solución. ¿Qué curso fue y es la primera vez que lo jalas? Márcalo como jalado en tu plan (menú (i) del curso) y te digo en qué periodo tienes que llevarlo.',
          cursos: [], preguntasSugeridas: ['¿Qué pasa si jalo un curso?', '¿Estoy sobrecargado?'],
        };
      }
      const respuesta = desdeSeccion(seccionWhatIf(contexto), otras('jalo'));
      return { ...respuesta, texto: `${respuesta.texto}\n¿Es la primera vez que lo jalas? Así te doy el consejo correcto.` };
    }
    case 'electivos': return desdeSeccion(seccionElectivos(contexto), otras('electivo'));
    case 'ruta': return desdeSeccion(seccionRuta(contexto), otras('ruta'));
    default: {
      if (focoCiclo) {
        const { periodo: resumen, carga, escenarios } = focoCiclo;
        return {
          texto: `${resumen.etiqueta}: ${resumen.cursos.length} cursos, ${horas(carga.horas)} y ${resumen.creditos} créditos. Nivel de carga: ${carga.nivel}.` +
            (escenarios[0] ? `\nCuesta ${soles(escenarios[0].total)} sin descuento.` : ''),
          cursos: resumen.cursos, preguntasSugeridas: ['¿Estoy sobrecargado?', '¿Me alcanza mi presupuesto?'],
        };
      }
      const respuesta = desdeSeccion(seccionCarga(contexto), otras('sobrecargado'));
      const primero = contexto.jalados[0];
      // Regla 3: con un jalado, ese curso va primero.
      return primero
        ? {
          ...respuesta,
          texto: `Primero va ${primero.nombre} (${primero.codigo}), que está jalado: tiene que ir ${enVentana(primero.ventana)}.\n${respuesta.texto}`,
          cursos: [primero.codigo, ...respuesta.cursos.filter((codigo) => codigo !== primero.codigo)],
        }
        : respuesta;
    }
  }
};

/** Respuesta simulada según el modo; el chat responde al último mensaje del usuario. */
export const generarRespuestaMock = (peticion: AIRequest): AIRespuesta => {
  if (peticion.modo === 'analisis') return mockAnalisis(peticion.contexto);
  const ultima = [...peticion.mensajes].reverse().find((mensaje) => mensaje.rol === 'user');
  return mockChat(peticion.contexto, ultima?.texto ?? '');
};
