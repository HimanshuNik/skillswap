export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AICompletionResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  durationMs: number;
  provider: string;
}

export interface RoadmapMilestoneItem {
  orderIndex: number;
  title: string;
  description: string;
  topics: string[];
  practiceProjects: string[];
  suggestedSessionGoals: string[];
}

export interface LearningRoadmapPlan {
  title: string;
  estimatedWeeks: number;
  milestones: RoadmapMilestoneItem[];
}

export interface SmartScheduleCandidate {
  date: string; // YYYY-MM-DD
  startTime: string; // ISO 8601 or HH:mm
  endTime: string;
  slotType: 'Morning' | 'Afternoon' | 'Evening';
  score: number; // 0 - 100
  reason: string;
  bothUsersAvailable: boolean;
}

export interface IAIProvider {
  readonly name: string;

  /**
   * Generates free-form text response (e.g. for learning assistant).
   */
  generateText(prompt: string, options?: AIOptions): Promise<AICompletionResult>;

  /**
   * Generates validated structured JSON output with a fallback default.
   */
  generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    fallback: T
  ): Promise<{ data: T; usage: AICompletionResult }>;

  /**
   * Calculates semantic similarity between two skill names (0.0 to 1.0).
   */
  calculateSemanticSimilarity(skillA: string, skillB: string): Promise<number>;

  /**
   * Generates structured learning roadmap with milestones, topics, and projects.
   */
  generateLearningRoadmap(
    skillName: string,
    currentLevel: string,
    targetLevel: string,
    objective: string,
    pace: string
  ): Promise<{ roadmap: LearningRoadmapPlan; usage: AICompletionResult }>;

  /**
   * Contextual Q&A assistant for skill learning, session agendas, and study advice.
   */
  answerLearningQuestion(
    query: string,
    userContext?: {
      learningSkills?: string[];
      teachingSkills?: string[];
    }
  ): Promise<AICompletionResult>;
}

