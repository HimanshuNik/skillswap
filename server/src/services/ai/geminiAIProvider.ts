import type {
  IAIProvider,
  AIOptions,
  AICompletionResult,
  LearningRoadmapPlan,
} from './aiProvider.interface.js';
import { LocalDeterministicAIProvider } from './localDeterministicAIProvider.js';
import { logger } from '../../config/logger.js';

export class GeminiAIProvider implements IAIProvider {
  readonly name = 'gemini';
  private fallbackProvider = new LocalDeterministicAIProvider();

  private get apiKey(): string | undefined {
    return process.env['GEMINI_API_KEY'];
  }

  async generateText(prompt: string, options?: AIOptions): Promise<AICompletionResult> {
    if (!this.apiKey) {
      logger.debug('[GeminiAIProvider] GEMINI_API_KEY not set; using deterministic fallback');
      return this.fallbackProvider.generateText(prompt, options);
    }

    const start = Date.now();
    try {
      const timeoutMs = options?.timeoutMs || 8000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 1024,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json() as any;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const promptTokens = json.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
      const completionTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

      return {
        text,
        promptTokens,
        completionTokens,
        model: 'gemini-1.5-flash',
        durationMs: Date.now() - start,
        provider: this.name,
      };
    } catch (err: any) {
      logger.warn({ error: err.message }, '[GeminiAIProvider] Request failed; falling back to deterministic');
      return this.fallbackProvider.generateText(prompt, options);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    fallback: T
  ): Promise<{ data: T; usage: AICompletionResult }> {
    if (!this.apiKey) {
      return this.fallbackProvider.generateStructured(prompt, schemaDescription, fallback);
    }

    const systemPrompt = `${prompt}\n\nYou must reply strictly with a JSON object matching this schema description:\n${schemaDescription}\nDo not include commentary or markdown formatting outside the JSON code block.`;
    const result = await this.generateText(systemPrompt);

    try {
      let jsonStr = result.text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(jsonStr) as T;
      return { data: parsed, usage: result };
    } catch (err) {
      logger.warn('[GeminiAIProvider] Failed to parse structured JSON response; returning fallback');
      return { data: fallback, usage: result };
    }
  }

  async calculateSemanticSimilarity(skillA: string, skillB: string): Promise<number> {
    // For deterministic reproducibility, semantic similarity uses the deterministic engine
    return this.fallbackProvider.calculateSemanticSimilarity(skillA, skillB);
  }

  async generateLearningRoadmap(
    skillName: string,
    currentLevel: string,
    targetLevel: string,
    objective: string,
    pace: string
  ): Promise<{ roadmap: LearningRoadmapPlan; usage: AICompletionResult }> {
    if (!this.apiKey) {
      return this.fallbackProvider.generateLearningRoadmap(skillName, currentLevel, targetLevel, objective, pace);
    }

    const prompt = `Generate a 4-milestone learning roadmap for "${skillName}". Current proficiency: ${currentLevel}, Target: ${targetLevel}, Goal: ${objective}, Pace: ${pace}. Format as JSON with: { "title": string, "estimatedWeeks": number, "milestones": [ { "orderIndex": number, "title": string, "description": string, "topics": string[], "practiceProjects": string[], "suggestedSessionGoals": string[] } ] }`;
    const fallback = (await this.fallbackProvider.generateLearningRoadmap(skillName, currentLevel, targetLevel, objective, pace)).roadmap;
    const res = await this.generateStructured<LearningRoadmapPlan>(prompt, 'LearningRoadmapPlan JSON', fallback);
    return { roadmap: res.data, usage: res.usage };
  }

  async answerLearningQuestion(
    query: string,
    userContext?: {
      learningSkills?: string[];
      teachingSkills?: string[];
    }
  ): Promise<AICompletionResult> {
    if (!this.apiKey) {
      return this.fallbackProvider.answerLearningQuestion(query, userContext);
    }

    const prompt = `You are the SkillSwap Learning Assistant. Help the user with skill learning advice and session preparation. Keep your response concise, educational, and actionable. Do not reveal private user data.\nUser Context:\nLearning skills: ${userContext?.learningSkills?.join(', ') || 'None specified'}\nTeaching skills: ${userContext?.teachingSkills?.join(', ') || 'None specified'}\n\nUser Question: ${query}`;
    return this.generateText(prompt);
  }
}
