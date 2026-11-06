import { db } from '../prisma/db.js';

export interface AIUsageRecordDTO {
  id: number;
  userId: number;
  feature: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostCents: number;
  durationMs: number;
  success: boolean;
  createdAt: string;
}

export class AIUsageRepository {
  async recordUsage(
    data: {
      userId: number;
      feature: string;
      provider: string;
      promptTokens: number;
      completionTokens: number;
      durationMs: number;
      success?: boolean;
    },
    client: any = db
  ): Promise<AIUsageRecordDTO> {
    // Gemini 1.5 Flash est cost: ~$0.075 per 1M prompt tokens, ~$0.30 per 1M completion tokens
    // Local deterministic: $0.00
    let estimatedCostCents = 0;
    if (data.provider === 'gemini') {
      const promptCost = (data.promptTokens / 1_000_000) * 7.5; // cents
      const completionCost = (data.completionTokens / 1_000_000) * 30.0; // cents
      estimatedCostCents = Math.round((promptCost + completionCost) * 1000) / 1000;
    }

    const record = await client.orm.public.AIUsageRecord.create({
      userId: data.userId,
      feature: data.feature,
      provider: data.provider,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      estimatedCostCents,
      durationMs: data.durationMs,
      success: data.success ?? true,
    });
    return record as unknown as AIUsageRecordDTO;
  }

  async getPlatformAIAnalytics(client: any = db) {
    const records = await client.orm.public.AIUsageRecord.all();
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCostCents = 0;
    let totalDurationMs = 0;
    const byFeature: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    for (const r of records as any[]) {
      totalPromptTokens += r.promptTokens || 0;
      totalCompletionTokens += r.completionTokens || 0;
      totalCostCents += r.estimatedCostCents || 0;
      totalDurationMs += r.durationMs || 0;
      byFeature[r.feature] = (byFeature[r.feature] || 0) + 1;
      byProvider[r.provider] = (byProvider[r.provider] || 0) + 1;
    }

    const totalRequests = records.length;
    const avgDurationMs = totalRequests > 0 ? Math.round(totalDurationMs / totalRequests) : 0;

    return {
      totalRequests,
      totalPromptTokens,
      totalCompletionTokens,
      totalCostCents: Math.round(totalCostCents * 100) / 100,
      avgDurationMs,
      byFeature,
      byProvider,
    };
  }
}

export const aiUsageRepository = new AIUsageRepository();

