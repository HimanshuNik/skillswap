import { db } from '../../prisma/db.js';
import { aiUsageRepository } from '../../repositories/aiUsage.repository.js';
import { getAIProvider } from './aiProvider.factory.js';
import { BadRequestError } from '../../utils/errors.js';

export interface AssistantChatResponse {
  message: string;
  suggestedFollowUps: string[];
  provider: string;
}

// In-memory rate limiting map for AI Assistant queries: max 20 requests per 1-minute window per user
const userRequestCounts = new Map<number, { count: number; resetAt: number }>();

export class AIAssistantService {
  async askQuestion(userId: number, question: string): Promise<AssistantChatResponse> {
    const start = Date.now();
    const cleanQuery = question?.trim();
    if (!cleanQuery) {
      throw new BadRequestError('Question cannot be empty');
    }
    if (cleanQuery.length > 500) {
      throw new BadRequestError('Question is too long (maximum 500 characters)');
    }

    // Rate limiting check
    const now = Date.now();
    const rateInfo = userRequestCounts.get(userId) || { count: 0, resetAt: now + 60000 };
    if (now > rateInfo.resetAt) {
      rateInfo.count = 1;
      rateInfo.resetAt = now + 60000;
    } else {
      rateInfo.count++;
      if (rateInfo.count > 20) {
        throw new BadRequestError('AI Assistant rate limit exceeded (maximum 20 queries per minute). Please try again shortly.');
      }
    }
    userRequestCounts.set(userId, rateInfo);

    // Fetch authorized user context (strictly user's own registered skills)
    const teachingSkills = await db.orm.public.UserTeachingSkill.where({ userId }).all();
    const learningSkills = await db.orm.public.UserLearningSkill.where({ userId }).all();
    const allSkills = await db.orm.public.Skill.all();
    const skillMap = new Map<number, string>(allSkills.map((s: any) => [s.id, s.name]));

    const userContext = {
      teachingSkills: (teachingSkills as any[]).map((t) => skillMap.get(t.skillId) || 'Skill'),
      learningSkills: (learningSkills as any[]).map((l) => skillMap.get(l.skillId) || 'Skill'),
    };

    const provider = getAIProvider();
    const completion = await provider.answerLearningQuestion(cleanQuery, userContext);

    // Record AI usage
    await aiUsageRepository.recordUsage({
      userId,
      feature: 'LEARNING_ASSISTANT',
      provider: completion.provider,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      durationMs: Date.now() - start,
      success: true,
    }).catch(() => {});

    // Dynamic contextual follow-up prompts
    const followUps = [
      'How should I structure my 60-minute session agenda?',
      'What questions should I ask my skill partner?',
      'Can you generate a learning roadmap for my goal?',
    ];

    return {
      message: completion.text,
      suggestedFollowUps: followUps,
      provider: completion.provider,
    };
  }
}

export const aiAssistantService = new AIAssistantService();

