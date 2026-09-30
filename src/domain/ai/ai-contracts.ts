// src/domain/ai/ai-contracts.ts
import { z } from "zod";

// ==========================================
// 1. Tipos Base (Entradas y Contexto)
// ==========================================

export type AIIntent =
  | "explain_plan"
  | "course_question"
  | "interpret_preferences"
  | "compare_scenarios";

export interface AIContextV1 {
  snapshotId: string;
  generatedAt: string; // ISO 8601
  academicContext: {
    periodoIngreso: "marzo" | "agosto";
    cicloActual: number;
    totalCiclos: number;
    veranosPermitidosTras: number[];
    periodosBloqueados: string[];
  };
  courses: Array<{
    codigo: string;
    nombre: string;
    estado: "APROBADO" | "CONVALIDADO" | "EN_CURSO" | "PENDIENTE";
    cicloOrigen: number;
    cicloAsignado: number;
    tipoPeriodo: "REGULAR" | "VERANO";
    ubicacion: "banco" | "periodo";
    creditos: number;
    horasSemanales: number;
    prerrequisitos: string[];
  }>;
}

export interface AIRequestV1 {
  version: 1;
  requestId: string;
  intent: AIIntent;
  question: string;
  context: Readonly<AIContextV1>; // Reforzamos la inmutabilidad
}

// ==========================================
// 2. Esquema de Validación de Salida (Zod)
// ==========================================
// Protege la frontera de la aplicación validando el 'unknown' del LLM

export const AIResponseV1Schema = z.object({
  version: z.literal(1),
  requestId: z.string(),
  snapshotId: z.string(),
  answer: z.string(),
  evidenceCourseCodes: z.array(z.string()),
  proposedPreferences: z
    .object({
      supported: z.object({
        limiteCreditos: z.number().optional(),
      }),
      unsupported: z.array(
        z.object({
          preference: z.string(),
          reason: z.string(),
        }),
      ),
    })
    .optional(),
  warnings: z.array(z.string()),
});

export type AIResponseV1 = z.infer<typeof AIResponseV1Schema>;

// ==========================================
// 3. Interfaz del Proveedor
// ==========================================

export interface AIAvailability {
  status:
    | "unavailable"
    | "available"
    | "downloading"
    | "loading"
    | "ready"
    | "error";
  reason?: string;
  progress?: number;
}

export interface AIProvider {
  id: "mock" | "webllm" | "gemini" | "deepseek";
  getAvailability(): Promise<AIAvailability>;
  generate(request: AIRequestV1, signal?: AbortSignal): Promise<unknown>;
}
