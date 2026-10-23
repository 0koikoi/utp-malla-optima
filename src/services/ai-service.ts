// src/services/ai-service.ts
import { AIResponseV1Schema } from "../domain/ai/ai-contracts";
import type {
  AIProvider,
  AIRequestV1,
  AIResponseV1,
} from "../domain/ai/ai-contracts";

export class AIManager {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async processRequest(
    request: AIRequestV1,
    signal?: AbortSignal,
  ): Promise<AIResponseV1> {
    try {
      // 1. LLamada aislada al proveedor (retorna unknown)
      const rawResponse = await this.provider.generate(request, signal);

      // 2. Validación estricta del contrato
      const validatedResponse = AIResponseV1Schema.parse(rawResponse);

      // 3. Verificación de congruencia de estado
      if (validatedResponse.snapshotId !== request.context.snapshotId) {
        throw new Error(
          "AI Context Snapshot mismatch. The state changed during generation.",
        );
      }

      return validatedResponse;
    } catch (error) {
      console.error("[AI Manager] Generation or Validation failed", error);
      throw error;
    }
  }
}
