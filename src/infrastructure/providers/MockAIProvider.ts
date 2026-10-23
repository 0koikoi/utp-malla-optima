// src/infrastructure/providers/MockAIProvider.ts
import { AIResponseV1Schema } from "../../domain/ai/ai-contracts";
import type {
  AIProvider,
  AIRequestV1,
  AIAvailability,
} from "../../domain/ai/ai-contracts";

export class MockAIProvider implements AIProvider {
  id = "mock" as const;

  async getAvailability(): Promise<AIAvailability> {
    return { status: "ready", progress: 1 };
  }

  async generate(request: AIRequestV1, signal?: AbortSignal): Promise<unknown> {
    // Simulamos latencia de red/procesamiento
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 1500);
      signal?.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });

    // Mock payload basado en la intención
    const mockPayload = {
      version: 1,
      requestId: request.requestId,
      snapshotId: request.context.snapshotId,
      answer: `Mock response for intent: ${request.intent}. Based on your query: "${request.question}".`,
      evidenceCourseCodes: request.context.courses
        .slice(0, 2)
        .map((c) => c.codigo),
      warnings: [
        "This is a simulated AI response. Do not use for real academic planning.",
      ],
    };

    // Aunque es un mock, lo pasamos por Zod para asegurar que nuestro mock cumple el contrato
    return AIResponseV1Schema.parse(mockPayload);
  }
}
