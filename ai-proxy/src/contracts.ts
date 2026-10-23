import { z } from 'zod';

/**
 * Contratos del asistente IA, compartidos entre el frontend y el proxy
 * (ai-proxy/src/contracts.ts es una copia exacta; un test falla si difieren).
 * Este archivo solo puede importar zod para que la copia compile en ambos lados.
 *
 * Toda cifra y toda decisión lógica viaja ya calculada en AIContext; la IA
 * solo redacta. Las respuestas se validan aquí y luego se filtran los códigos
 * de curso que no existan en el contexto.
 */

export const MAX_MENSAJES = 8;
export const MAX_TEXTO_MENSAJE = 1000;
export const MAX_ACCIONES = 3;
export const MAX_PREGUNTAS = 3;

export const NivelSchema = z.enum(['ok', 'atencion', 'riesgo']);
export type Nivel = z.infer<typeof NivelSchema>;

const PeriodoIdSchema = z.string().regex(/^(ciclo|verano)-\d+$/);
const monto = z.number().finite();

// ==========================================
// Contexto (lo calcula buildAIContext)
// ==========================================

const CursoCatalogoSchema = z.object({
  codigo: z.string(),
  nombre: z.string(),
  estado: z.enum(['APROBADO', 'CONVALIDADO', 'EN_CURSO', 'PENDIENTE']),
  tipo: z.enum(['OBLIGATORIO', 'ELECTIVO']),
  creditos: z.number(),
  /** "banco" o el id del periodo donde está ubicado. */
  ubicacion: z.string(),
});

const CursoPlanificadoSchema = z.object({
  codigo: z.string(),
  nombre: z.string(),
  creditos: z.number(),
  horas: z.number(),
  tipo: z.enum(['OBLIGATORIO', 'ELECTIVO']),
  /** Cursos pendientes que dependen de este, directa o indirectamente. */
  impacto: z.number().int(),
  /** Largo de la cadena de prerrequisitos que empieza en este curso. */
  longitudCadena: z.number().int(),
  esLaboratorio: z.boolean(),
  jalado: z.boolean(),
});

const EscenarioPeriodoSchema = z.object({
  id: z.enum(['sin_descuento', 'interbank_scotiabank', 'bcp_bbva', 'pago_unico']),
  nombre: z.string(),
  matricula: monto,
  numeroCuotas: z.number().int(),
  /** Cuota mensual; en pago único es el equivalente mensual del pago. */
  cuotaMensual: monto,
  total: monto,
  /** presupuestoMensual - cuotaMensual (negativo = no alcanza). */
  diferenciaPresupuesto: monto.nullable(),
});

const EscenarioPlanSchema = z.object({
  id: EscenarioPeriodoSchema.shape.id,
  nombre: z.string(),
  total: monto,
});

const CargaSchema = z.object({
  nivel: NivelSchema,
  puntos: z.number().int(),
  horas: z.number(),
  topeEscala: z.number().nullable(),
  limiteRecomendado: z.number(),
  cursos4HorasOMas: z.number().int(),
  laboratorios: z.number().int(),
  cadenasLargas: z.number().int(),
  motivos: z.array(z.string()),
});

const PeriodoResumenSchema = z.object({
  id: PeriodoIdSchema,
  etiqueta: z.string(),
  cursos: z.array(z.string()),
  horas: z.number(),
  creditos: z.number(),
});

/**
 * Restas y totales que la IA no debe hacer (D-001): todo lo que puede necesitar para responder
 * "cuánto me falta" o "cuánto me paso" ya viene calculado aquí.
 */
const DerivadosSchema = z.object({
  /** Horas del próximo periodo frente al tope de la escala y a las 24 h recomendadas (0 si no se pasa). */
  horas: z.object({
    proximoPeriodo: z.number(),
    topeEscala: z.number().nullable(),
    sobreTopeEscala: z.number(),
    margenTopeEscala: z.number(),
    recomendadas: z.number(),
    sobreRecomendadas: z.number(),
    margenRecomendadas: z.number(),
  }),
  /** Cada escenario de pago del próximo periodo contra el presupuesto; null sin presupuesto. */
  presupuesto: z.array(z.object({
    id: z.enum(['sin_descuento', 'interbank_scotiabank', 'bcp_bbva', 'pago_unico']),
    alcanza: z.boolean(),
    /** presupuesto - cuotaMensual (negativo = no alcanza). */
    diferenciaMes: monto,
    /** Lo que falta (> 0 si no alcanza) o sobra cada mes, en positivo. */
    faltaPorMes: monto,
    sobraPorMes: monto,
    /** diferenciaMes × numeroCuotas: las cuotas del ciclo (la matrícula se paga aparte). */
    diferenciaCiclo: monto,
    faltaPorCiclo: monto,
    sobraPorCiclo: monto,
  })).nullable(),
  creditos: z.object({
    /** Suma de los créditos de todos los cursos de la malla (incluye todos los electivos ofrecidos). */
    totalMalla: z.number(),
    obligatorios: z.number(),
    /** Créditos electivos mínimos (academic.json, creditosMinimosElectivos). */
    electivosMinimos: z.number(),
    /** obligatorios + electivosMinimos. */
    paraEgresar: z.number(),
    /** Aprobados o convalidados que cuentan: obligatorios + electivos hasta el mínimo. */
    aprobadosQueCuentan: z.number(),
    enCurso: z.number(),
    /** paraEgresar - aprobadosQueCuentan (incluye lo que está en curso). */
    faltanParaEgresar: z.number(),
    /** faltanParaEgresar - créditos obligatorios en curso: lo que faltaría si aprueba todo lo que lleva. */
    faltanSiApruebaEnCurso: z.number(),
    ciclosRestantes: z.number().int(),
  }),
  /** Cursos del próximo periodo: si se puede mover sin dejar inválidos otros cursos planificados. */
  cursosProximoPeriodo: z.array(z.object({
    codigo: z.string(),
    nombre: z.string(),
    creditos: z.number(),
    horas: z.number(),
    estado: z.enum(['APROBADO', 'CONVALIDADO', 'EN_CURSO', 'PENDIENTE']),
    jalado: z.boolean(),
    sePuedeMover: z.boolean(),
    /** Cursos planificados que quedarían sin su prerrequisito si se mueve. */
    bloquearia: z.array(z.string()),
  })),
});

const WhatIfSchema = z.object({
  codigo: z.string(),
  origen: z.enum(['EN_CURSO', 'PROXIMO_PERIODO']),
  cursosBloqueados: z.array(z.string()),
  planificadosInvalidos: z.array(z.object({ codigo: z.string(), periodoId: PeriodoIdSchema })),
  /** Ventana de recuperación si se jalara: periodos donde tendría que llevarse (vacía si no está ubicado). */
  ventanaSiJala: z.array(PeriodoIdSchema),
});

const FocoCursoSchema = z.object({
  tipo: z.literal('curso'),
  codigo: z.string(),
  nombre: z.string(),
  estado: CursoCatalogoSchema.shape.estado,
  tipoCurso: CursoCatalogoSchema.shape.tipo,
  creditos: z.number(),
  horas: z.number(),
  ubicacion: z.string(),
  esLaboratorio: z.boolean(),
  jalado: z.boolean(),
  impacto: z.number().int(),
  longitudCadena: z.number().int(),
  prerrequisitos: z.array(z.object({ codigo: z.string(), nombre: z.string(), estado: z.string() })),
  habilitaA: z.array(z.string()),
  whatIf: WhatIfSchema.omit({ origen: true }),
  ventanaRecuperacion: z.array(PeriodoIdSchema),
  area: z.string().nullable(),
});

const FocoCicloSchema = z.object({
  tipo: z.literal('ciclo'),
  periodo: PeriodoResumenSchema,
  cursos: z.array(CursoPlanificadoSchema),
  carga: CargaSchema,
  escenarios: z.array(EscenarioPeriodoSchema),
  jaladosEnVentana: z.array(z.string()),
});

export const AIContextSchema = z.object({
  version: z.literal(1),
  perfil: z.object({
    periodoIngreso: z.enum(['marzo', 'agosto']).nullable(),
    cicloActual: z.number().int().nullable(),
    totalCiclos: z.number().int(),
    disciplina: z.string(),
    creditos: z.object({ aprobados: z.number(), enCurso: z.number(), pendientes: z.number() }),
    electivos: z.object({ cubiertos: z.number(), minimo: z.number(), faltantes: z.number() }),
  }),
  catalogo: z.array(CursoCatalogoSchema),
  periodosPlanificados: z.array(PeriodoResumenSchema),
  proximoPeriodo: z.object({
    id: PeriodoIdSchema,
    etiqueta: z.string(),
    cursos: z.array(CursoPlanificadoSchema),
    totalHoras: z.number(),
    totalCreditos: z.number(),
    horasExceso: z.number(),
  }).nullable(),
  jalados: z.array(z.object({
    codigo: z.string(),
    nombre: z.string(),
    ventana: z.array(PeriodoIdSchema),
    ubicacionActual: z.string(),
    enVentana: z.boolean(),
  })),
  financiero: z.object({
    moneda: z.string(),
    referencia: z.string(),
    metodoPagoElegido: z.object({ id: z.string(), nombre: z.string() }),
    costoHoraAdicional: monto.nullable(),
    presupuestoMensual: monto.nullable(),
    proximoPeriodo: z.array(EscenarioPeriodoSchema),
    planCompleto: z.array(EscenarioPlanSchema),
  }).nullable(),
  carga: CargaSchema,
  whatIf: z.array(WhatIfSchema),
  ruta: z.object({
    propuesta: z.array(z.object({ periodoId: PeriodoIdSchema, cursos: z.array(z.string()) })),
    ciclosRestantes: z.number().int(),
    cicloFinal: z.number().int().nullable(),
    noPlanificados: z.array(z.string()),
  }),
  electivos: z.array(z.object({
    codigo: z.string(),
    nombre: z.string(),
    creditos: z.number(),
    horas: z.number(),
    area: z.string().nullable(),
    areaConfirmada: z.boolean(),
    ubicacion: z.string(),
  })),
  limites: z.object({
    creditosMinimos: z.number(),
    creditosMaximos: z.number(),
    horasRecomendadasPeriodo: z.number(),
    horasMaximasPlanificacion: z.number(),
    creditosMaximosVerano: z.number(),
    creditosMinimosElectivos: z.number(),
    factorHorasVerano: z.number(),
    topeEscalaPension: z.number().nullable(),
  }),
  foco: z.discriminatedUnion('tipo', [z.object({ tipo: z.literal('plan') }), FocoCicloSchema, FocoCursoSchema]).nullable(),
  derivados: DerivadosSchema,
});
export type AIContext = z.infer<typeof AIContextSchema>;
export type AIDerivados = z.infer<typeof DerivadosSchema>;
export type AICursoPlanificado = z.infer<typeof CursoPlanificadoSchema>;
export type AIEscenarioPeriodo = z.infer<typeof EscenarioPeriodoSchema>;
export type AICarga = z.infer<typeof CargaSchema>;
export type AIWhatIf = z.infer<typeof WhatIfSchema>;
export type AIFocoContexto = NonNullable<AIContext['foco']>;

// ==========================================
// Petición
// ==========================================

export const AIFocoSchema = z.object({
  tipo: z.enum(['plan', 'ciclo', 'curso']),
  id: z.string().max(40).optional(),
});
export type AIFoco = z.infer<typeof AIFocoSchema>;

export const AIMensajeSchema = z.object({
  rol: z.enum(['user', 'assistant']),
  texto: z.string().max(MAX_TEXTO_MENSAJE),
});
export type AIMensaje = z.infer<typeof AIMensajeSchema>;

export const AIRequestSchema = z.object({
  modo: z.enum(['analisis', 'chat']),
  contexto: AIContextSchema,
  foco: AIFocoSchema.optional(),
  mensajes: z.array(AIMensajeSchema).max(MAX_MENSAJES),
});
export type AIRequest = z.infer<typeof AIRequestSchema>;

// ==========================================
// Respuestas (lo que devuelve la IA)
// ==========================================

export const TIPOS_SECCION = ['financiero', 'carga', 'ruta', 'whatIf', 'electivos'] as const;

export const AISeccionSchema = z.object({
  tipo: z.enum(TIPOS_SECCION),
  nivel: NivelSchema,
  titulo: z.string(),
  detalle: z.string(),
  acciones: z.array(z.string()).max(MAX_ACCIONES),
  cursos: z.array(z.string()),
});
export type AISeccion = z.infer<typeof AISeccionSchema>;

export const AIAnalisisResponseSchema = z.object({
  resumen: z.string(),
  secciones: z.array(AISeccionSchema),
  preguntasSugeridas: z.array(z.string()).max(MAX_PREGUNTAS),
});
export type AIAnalisisResponse = z.infer<typeof AIAnalisisResponseSchema>;

export const AIChatResponseSchema = z.object({
  texto: z.string(),
  cursos: z.array(z.string()),
  preguntasSugeridas: z.array(z.string()).max(MAX_PREGUNTAS),
});
export type AIChatResponse = z.infer<typeof AIChatResponseSchema>;

export type AIRespuesta = AIAnalisisResponse | AIChatResponse;

// ==========================================
// Errores
// ==========================================

export const CODIGOS_ERROR = [
  'SIN_SALDO', 'LIMITE', 'PROVEEDOR_CAIDO', 'ENTRADA_INVALIDA', 'RESPUESTA_INVALIDA', 'SIN_CONEXION', 'PAUSADO',
  'RESPUESTA_LARGA', 'RESPUESTA_NO_VERIFICADA',
] as const;
export const AIErrorCodigoSchema = z.enum(CODIGOS_ERROR);
export type AIErrorCodigo = z.infer<typeof AIErrorCodigoSchema>;

export const MENSAJE_LIMITE = 'Llegaste al límite de consultas por ahora. Intenta de nuevo en un rato.';
/** Respuesta segura fija cuando el filtro de salida del proxy no pudo verificar los datos. */
export const MENSAJE_NO_VERIFICADA = 'No pude verificar esos datos con seguridad. Revisa la pestaña Simulación de cuotas o pregúntame de otra forma.';

/** `reintentarEn` (ISO) llega con LIMITE cuando el tope es del proxy: inicio de la ventana siguiente. */
export const AIErrorResponseSchema = z.object({
  error: AIErrorCodigoSchema,
  mensaje: z.string().max(200).optional(),
  reintentarEn: z.iso.datetime().optional(),
});
export type AIErrorResponse = z.infer<typeof AIErrorResponseSchema>;

/** Esquema JSON (para el prompt) de la respuesta de cada modo. */
export const esquemaRespuesta = (modo: AIRequest['modo']) =>
  z.toJSONSchema(modo === 'analisis' ? AIAnalisisResponseSchema : AIChatResponseSchema);

// ==========================================
// Post-validación
// ==========================================

export const codigosDelContexto = (contexto: AIContext): Set<string> =>
  new Set(contexto.catalogo.map((curso) => curso.codigo));

const filtrar = (codigos: string[], validos: Set<string>) => [...new Set(codigos.filter((codigo) => validos.has(codigo)))];

/** Valida la respuesta del modo y descarta los códigos de curso que no existan en el contexto. */
export function parsearRespuesta(modo: 'analisis', datos: unknown, contexto: AIContext): AIAnalisisResponse;
export function parsearRespuesta(modo: 'chat', datos: unknown, contexto: AIContext): AIChatResponse;
export function parsearRespuesta(modo: AIRequest['modo'], datos: unknown, contexto: AIContext): AIRespuesta;
export function parsearRespuesta(modo: AIRequest['modo'], datos: unknown, contexto: AIContext): AIRespuesta {
  const validos = codigosDelContexto(contexto);
  if (modo === 'analisis') {
    const respuesta = AIAnalisisResponseSchema.parse(datos);
    return {
      ...respuesta,
      secciones: respuesta.secciones.map((seccion) => ({ ...seccion, cursos: filtrar(seccion.cursos, validos) })),
    };
  }
  const respuesta = AIChatResponseSchema.parse(datos);
  return { ...respuesta, cursos: filtrar(respuesta.cursos, validos) };
}
