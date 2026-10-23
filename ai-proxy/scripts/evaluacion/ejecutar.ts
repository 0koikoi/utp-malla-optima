import type { AIContext, AIErrorCodigo, AIRequest, AIRespuesta } from '../../src/contracts.js';
import { costoEstimadoUsd, sumarUso, USO_VACIO, type UsoTokens } from '../../src/consumo.js';
import type { Caso, Fixture } from './casos.js';
import { chequear, type Fallo, type Severidad } from './chequeos.js';

/** Resultado de una llamada (la real usa llamarDeepSeek, igual que producción). */
export interface ResultadoLlamada {
  respuesta: AIRespuesta | null;
  error: AIErrorCodigo | null;
  /** Contenido crudo de la última respuesta del modelo (para el reporte y los códigos sin filtrar). */
  crudo: string | null;
  uso: UsoTokens;
  intentos: number;
}

export interface Repeticion {
  numero: number;
  ms: number;
  costoUsd: number;
  uso: UsoTokens;
  intentos: number;
  error: AIErrorCodigo | null;
  respuesta: AIRespuesta | null;
  crudo: string | null;
  fallos: Fallo[];
}

export interface ResultadoCaso {
  caso: Caso;
  repeticiones: Repeticion[];
  /** Pasa solo si todas sus repeticiones pasan. */
  aprobado: boolean;
}

export interface ResultadoEvaluacion {
  casos: ResultadoCaso[];
  detenidoPorCosto: boolean;
  costoUsd: number;
  uso: UsoTokens;
  latencias: number[];
}

export interface OpcionesEvaluacion {
  casos: Caso[];
  fixtures: (nombre: Fixture) => AIContext;
  llamar: (peticion: AIRequest) => Promise<ResultadoLlamada>;
  repeticiones: number;
  solo?: string;
  maxUsd: number;
  /** true si la llamada cae en horario pico (precio doble). */
  horarioPico: () => boolean;
  ahora?: () => number;
  progreso?: (linea: string) => void;
}

export const peticionDe = (caso: Caso, contexto: AIContext): AIRequest => ({
  modo: caso.modo,
  contexto,
  ...(caso.foco ? { foco: caso.foco } : {}),
  mensajes: caso.mensajes.map((texto) => ({ rol: 'user' as const, texto })),
});

const codigosCrudos = (crudo: string | null): string[] => {
  if (!crudo) return [];
  try {
    const datos = JSON.parse(crudo) as { cursos?: unknown; secciones?: { cursos?: unknown }[] };
    const listas = [datos.cursos, ...(datos.secciones ?? []).map((seccion) => seccion.cursos)];
    return listas.flatMap((lista) => (Array.isArray(lista) ? lista.filter((item): item is string => typeof item === 'string') : []));
  } catch {
    return [];
  }
};

/** Corre los casos en serie. Antes de cada llamada revisa el tope de costo. */
export const evaluar = async (opciones: OpcionesEvaluacion): Promise<ResultadoEvaluacion> => {
  const { llamar, fixtures, repeticiones, maxUsd, horarioPico, ahora = Date.now, progreso = () => undefined } = opciones;
  const casos = opciones.solo ? opciones.casos.filter((caso) => caso.id === opciones.solo) : opciones.casos;
  if (opciones.solo && !casos.length) throw new Error(`No existe el caso "${opciones.solo}".`);

  const resultado: ResultadoEvaluacion = { casos: [], detenidoPorCosto: false, costoUsd: 0, uso: USO_VACIO, latencias: [] };
  for (const caso of casos) {
    const contexto = fixtures(caso.fixture);
    const filas: Repeticion[] = [];
    for (let numero = 1; numero <= repeticiones; numero += 1) {
      if (resultado.costoUsd >= maxUsd) {
        resultado.detenidoPorCosto = true;
        break;
      }
      const inicio = ahora();
      const llamada = await llamar(peticionDe(caso, contexto));
      const ms = ahora() - inicio;
      const costoUsd = costoEstimadoUsd(llamada.uso, horarioPico());
      const fallos = llamada.error && llamada.error !== 'RESPUESTA_INVALIDA'
        ? [{ severidad: 'CRITICO' as Severidad, chequeo: 'error-proveedor', detalle: `La llamada falló con ${llamada.error}.` }]
        : chequear({
          modo: caso.modo, contexto, mensajes: caso.mensajes, esperado: caso.esperado,
          respuesta: llamada.respuesta, codigosCrudos: codigosCrudos(llamada.crudo),
        });
      filas.push({ numero, ms, costoUsd, uso: llamada.uso, intentos: llamada.intentos, error: llamada.error, respuesta: llamada.respuesta, crudo: llamada.crudo, fallos });
      resultado.costoUsd = Number((resultado.costoUsd + costoUsd).toFixed(6));
      resultado.uso = sumarUso(resultado.uso, llamada.uso);
      resultado.latencias.push(ms);
      progreso(`${fallos.length ? '✗' : '✓'} ${caso.id} #${numero} · ${ms} ms · US$ ${resultado.costoUsd.toFixed(4)}${fallos.length ? ` · ${fallos.map((fallo) => `${fallo.severidad}:${fallo.chequeo}`).join(', ')}` : ''}`);
    }
    if (filas.length) resultado.casos.push({ caso, repeticiones: filas, aprobado: filas.length === repeticiones && filas.every((fila) => !fila.fallos.length) });
    if (resultado.detenidoPorCosto) break;
  }
  return resultado;
};

export const percentil = (valores: number[], p: number): number => {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)];
};

export const fallosPorSeveridad = (resultado: ResultadoEvaluacion): Record<Severidad, number> => {
  const conteo: Record<Severidad, number> = { CRITICO: 0, MAYOR: 0, MENOR: 0 };
  for (const { repeticiones } of resultado.casos) for (const fila of repeticiones) for (const fallo of fila.fallos) conteo[fallo.severidad] += 1;
  return conteo;
};

/** 1 si hay algún fallo CRÍTICO; 2 si se detuvo por el tope de costo; 0 si no. */
export const codigoDeSalida = (resultado: ResultadoEvaluacion): number =>
  fallosPorSeveridad(resultado).CRITICO > 0 ? 1 : resultado.detenidoPorCosto ? 2 : 0;
