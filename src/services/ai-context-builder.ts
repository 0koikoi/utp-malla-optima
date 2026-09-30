// src/services/ai-context-builder.ts
import type { AIContextV1 } from "../domain/ai/ai-contracts";

// ==========================================
// 1. Representación (Ejemplo) del Estado de Zustand
// ==========================================
export interface MallaState {
  settings: {
    periodoIngreso: "marzo" | "agosto";
    cicloActual: number;
    totalCiclos: number;
    veranosPermitidosTras: number[];
    periodosBloqueados: string[];
  };
  cursos: Array<{
    id: string; // ID interno de la app
    codigo: string;
    nombre: string;
    estado: "APROBADO" | "CONVALIDADO" | "EN_CURSO" | "PENDIENTE";
    cicloDeMalla: number; // El ciclo al que pertenece originalmente el curso
    cicloProgramado: number; // El ciclo donde el estudiante lo ha ubicado
    esVerano: boolean;
    enBanco: boolean; // Si está en el "banco de cursos pendientes" o ya en la malla
    creditos: number;
    horasSemanales: number;
    prerrequisitos: string[];
  }>;
}

// ==========================================
// 2. Función Estrictamente Pura (AI Context Builder)
// ==========================================
/**
 * Transforma el estado interno de la aplicación en una instantánea inmutable
 * para el proveedor de Inteligencia Artificial.
 *
 * @param state - El estado actual de Zustand (solo lectura)
 * @param snapshotId - UUID generado en la capa de interacción
 * @param timestamp - Fecha de generación inyectada
 * @returns AIContextV1 - Objeto plano sin referencias al estado original
 */
export function buildAIContext(
  state: MallaState,
  snapshotId: string,
  timestamp: Date,
): AIContextV1 {
  return {
    snapshotId,
    generatedAt: timestamp.toISOString(),

    // Clonamos profundamente (deep copy nivel 1) para romper referencias con Zustand
    academicContext: {
      periodoIngreso: state.settings.periodoIngreso,
      cicloActual: state.settings.cicloActual,
      totalCiclos: state.settings.totalCiclos,
      veranosPermitidosTras: [...state.settings.veranosPermitidosTras],
      periodosBloqueados: [...state.settings.periodosBloqueados],
    },

    // Mapeamos los cursos a la estructura que exige el contrato de la IA
    courses: state.cursos.map((curso) => ({
      codigo: curso.codigo,
      nombre: curso.nombre,
      estado: curso.estado,

      // Mapeo clave solicitado: Origen vs Asignado
      cicloOrigen: curso.cicloDeMalla,
      cicloAsignado: curso.cicloProgramado,

      // Derivamos la lógica interna hacia los literales del contrato
      tipoPeriodo: curso.esVerano ? "VERANO" : "REGULAR",
      ubicacion: curso.enBanco ? "banco" : "periodo",

      creditos: curso.creditos,
      horasSemanales: curso.horasSemanales,
      prerrequisitos: [...curso.prerrequisitos], // Rompemos referencia del array
    })),
  };
}
