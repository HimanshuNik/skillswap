import type {
  IAIProvider,
  AIOptions,
  AICompletionResult,
  LearningRoadmapPlan,
  RoadmapMilestoneItem,
} from './aiProvider.interface.js';
import { logger } from '../../config/logger.js';

/**
 * Normalizes a skill string for comparison (lowercase, trimmed, stripped of punctuation).
 */
function normalizeSkill(str: string): string {
  return str
    .toLowerCase()
    .replace(/[._\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }
  return matrix[bn]![an]!;
}

/**
 * Token Jaccard similarity.
 */
function tokenJaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeSkill(a).split(' '));
  const setB = new Set(normalizeSkill(b).split(' '));
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// Domain synonym dictionary for high-precision local semantic mapping
const KNOWN_SYNONYMS: Record<string, string[]> = {
  react: ['reactjs', 'react js', 'react development', 'react dev'],
  javascript: ['js', 'ecmascript', 'javascript es6', 'modern javascript', 'es6'],
  typescript: ['ts'],
  node: ['nodejs', 'node js'],
  'ui/ux design': ['ui design', 'ux design', 'user interface design', 'user experience design', 'product design', 'ux/ui design'],
  python: ['python3', 'python programming'],
  seo: ['search engine optimization'],
  'digital marketing': ['online marketing', 'internet marketing'],
};

export class LocalDeterministicAIProvider implements IAIProvider {
  readonly name = 'deterministic';

  async generateText(prompt: string, _options?: AIOptions): Promise<AICompletionResult> {
    const start = Date.now();
    const promptTokens = Math.ceil(prompt.length / 4);
    const text = `[SkillSwap Deterministic AI] Processed inquiry in ${Date.now() - start}ms. Recommendations are calculated deterministically using PostgreSQL verified relationships.`;
    const completionTokens = Math.ceil(text.length / 4);
    return {
      text,
      promptTokens,
      completionTokens,
      model: 'local-deterministic-v1',
      durationMs: Date.now() - start,
      provider: this.name,
    };
  }

  async generateStructured<T>(
    prompt: string,
    _schemaDescription: string,
    fallback: T
  ): Promise<{ data: T; usage: AICompletionResult }> {
    const start = Date.now();
    const promptTokens = Math.ceil(prompt.length / 4);
    const durationMs = Date.now() - start;

    return {
      data: fallback,
      usage: {
        text: JSON.stringify(fallback),
        promptTokens,
        completionTokens: Math.ceil(JSON.stringify(fallback).length / 4),
        model: 'local-deterministic-v1',
        durationMs,
        provider: this.name,
      },
    };
  }

  async calculateSemanticSimilarity(skillA: string, skillB: string): Promise<number> {
    const normA = normalizeSkill(skillA);
    const normB = normalizeSkill(skillB);

    if (normA === normB) return 1.0;

    // Check direct synonyms
    for (const [canonical, aliases] of Object.entries(KNOWN_SYNONYMS)) {
      const allVariants = [canonical, ...aliases];
      const matchA = allVariants.some((v) => normA === v || normA.includes(v));
      const matchB = allVariants.some((v) => normB === v || normB.includes(v));
      if (matchA && matchB) {
        return 0.95;
      }
    }

    // Token Jaccard check
    const jaccard = tokenJaccardSimilarity(skillA, skillB);
    if (jaccard >= 0.5) {
      return 0.85;
    }

    // Levenshtein ratio for minor typos / pluralizations
    const maxLen = Math.max(normA.length, normB.length);
    if (maxLen > 0) {
      const dist = levenshteinDistance(normA, normB);
      const ratio = 1 - dist / maxLen;
      if (ratio >= 0.8) {
        return Math.min(0.9, Math.round(ratio * 100) / 100);
      }
    }

    // Related technology check (same domain but separate skills, e.g. React vs Vue)
    const webDevSkills = ['react', 'vue', 'angular', 'svelte', 'javascript', 'typescript', 'html', 'css'];
    const isBothWebDev = webDevSkills.some((s) => normA.includes(s)) && webDevSkills.some((s) => normB.includes(s));
    if (isBothWebDev) {
      return 0.6; // Related, but distinct skills!
    }

    return 0.15; // Unrelated
  }

  async generateLearningRoadmap(
    skillName: string,
    currentLevel: string,
    targetLevel: string,
    objective: string,
    pace: string
  ): Promise<{ roadmap: LearningRoadmapPlan; usage: AICompletionResult }> {
    const start = Date.now();
    const cleanSkill = skillName.trim();
    const weeks = pace.toUpperCase() === 'INTENSIVE' ? 4 : pace.toUpperCase() === 'CASUAL' ? 12 : 8;

    const milestones: RoadmapMilestoneItem[] = [
      {
        orderIndex: 1,
        title: `Stage 1: Core Fundamentals of ${cleanSkill}`,
        description: `Establish a rock-solid mental model and essential concepts required for ${objective || `${targetLevel} proficiency`}.`,
        topics: [
          `Foundations & Architecture of ${cleanSkill}`,
          `Syntax, standard patterns, and conventions`,
          `Setting up optimal tooling & developer environment`,
          `Common anti-patterns and debugging fundamentals`,
        ],
        practiceProjects: [
          `Build a minimal playground or starter application`,
          `Refactor an existing toy project to follow ${cleanSkill} best practices`,
        ],
        suggestedSessionGoals: [
          `Review architecture mental model with your mentor`,
          `Live code walk-through of your initial starter setup`,
        ],
      },
      {
        orderIndex: 2,
        title: `Stage 2: Applied Workflows & Real-World Mechanics`,
        description: `Move beyond basic syntax into dynamic scenarios, state management, and real-world workflows.`,
        topics: [
          `Data flow, lifecycle, and component/module design`,
          `Asynchronous operations and API integrations`,
          `Handling errors, edge cases, and validation`,
          `Performance considerations & clean code organization`,
        ],
        practiceProjects: [
          `Construct an interactive dashboard or utility tool using ${cleanSkill}`,
          `Integrate an external REST API or data pipeline`,
        ],
        suggestedSessionGoals: [
          `Pair programming session: debug a tricky asynchronous workflow`,
          `Code review on your project structure and error handling`,
        ],
      },
      {
        orderIndex: 3,
        title: `Stage 3: Advanced Optimization & Production Readiness`,
        description: `Refine your ${cleanSkill} capabilities with professional production techniques, security, and scalability.`,
        topics: [
          `Scalable architecture patterns for larger codebases`,
          `Testing strategies: unit, integration, and mocking`,
          `Security best practices, input sanitization, and defenses`,
          `Deployment, monitoring, and profiling`,
        ],
        practiceProjects: [
          `Build an end-to-end production-ready feature with automated tests`,
          `Benchmark and optimize execution latency or render efficiency`,
        ],
        suggestedSessionGoals: [
          `Peer code review focusing on production resilience and architecture`,
          `Discuss real-world tradeoffs and system scaling challenges`,
        ],
      },
      {
        orderIndex: 4,
        title: `Stage 4: Capstone Mastery & Reciprocal Peer Demonstration`,
        description: `Synthesize your skills into an impressive portfolio artifact and validate ${targetLevel} mastery.`,
        topics: [
          `Architectural design review and technical documentation`,
          `Teaching and explaining ${cleanSkill} concepts clearly to others`,
          `Continuous learning resources and community engagement`,
        ],
        practiceProjects: [
          `Complete capstone project solving a real problem with ${cleanSkill}`,
          `Write a technical blog post or walkthrough explaining a key concept`,
        ],
        suggestedSessionGoals: [
          `Present your completed capstone to your skill partner for feedback`,
          `Simulate a technical exchange session where you demonstrate and teach a concept back`,
        ],
      },
    ];

    const roadmap: LearningRoadmapPlan = {
      title: `${cleanSkill} Mastery Roadmap (${currentLevel} → ${targetLevel})`,
      estimatedWeeks: weeks,
      milestones,
    };

    const promptTokens = 120;
    const completionTokens = 450;
    const durationMs = Date.now() - start;

    return {
      roadmap,
      usage: {
        text: JSON.stringify(roadmap),
        promptTokens,
        completionTokens,
        model: 'local-deterministic-v1',
        durationMs,
        provider: this.name,
      },
    };
  }

  async answerLearningQuestion(
    query: string,
    userContext?: {
      learningSkills?: string[];
      teachingSkills?: string[];
    }
  ): Promise<AICompletionResult> {
    const start = Date.now();
    const cleanQuery = query.toLowerCase().trim();

    let answer = '';

    // Guardrail against malicious queries / personal data requests
    if (
      cleanQuery.includes('password') ||
      cleanQuery.includes('token') ||
      cleanQuery.includes('email') ||
      cleanQuery.includes('credit card') ||
      cleanQuery.includes('secret') ||
      cleanQuery.includes('database') ||
      cleanQuery.includes('drop table')
    ) {
      answer = 'I am your SkillSwap Learning Assistant. I can only assist with skill development, session preparation, learning objectives, and platform educational features. For security reasons, account credentials and private data cannot be accessed.';
    } else if (cleanQuery.includes('prepare') || cleanQuery.includes('session agenda')) {
      answer = `### How to Prepare for a Productive SkillSwap Session:\n\n1. **Define a Clear Objective:** Agree in advance on 1-2 specific goals (e.g., "Build a React custom hook" or "Review Figma design system hierarchy").\n2. **Have Code / Work Ready:** Open your IDE, code repository, or design workspace before the scheduled start time.\n3. **Test Video & Audio:** Verify your camera and microphone in the Jitsi Meet room 5 minutes early.\n4. **Balance Reciprocity:** Remember that in a mutual skill exchange, both participants have designated teaching sessions. Take structured notes to share back!`;
    } else if (cleanQuery.includes('question') || cleanQuery.includes('ask partner') || cleanQuery.includes('ask my')) {
      answer = `### Recommended Questions for Your Skill Partner:\n\n1. *"What was the most challenging obstacle when you first learned this skill, and how did you overcome it?"*\n2. *"Could you walk me through your personal workflow and tooling setup for real-world projects?"*\n3. *"What are common anti-patterns or beginner mistakes I should actively avoid?"*\n4. *"What is one hands-on exercise you recommend I complete before our next session?"*`;
    } else if (cleanQuery.includes('how it works') || cleanQuery.includes('how does skillswap work') || cleanQuery.includes('swap rules')) {
      answer = `### SkillSwap Reciprocal Model:\n\n* **Mutual Exchange:** User A teaches a skill User B wants to learn, and User B teaches a skill User A wants to learn.\n* **Two-Session Model:** Each swap coordinates two dedicated sessions so both partners receive focused instruction.\n* **Video & Chat:** Sessions happen via built-in Jitsi Meet rooms with persistent real-time chat.\n* **Reviews & Reputation:** After both reciprocal sessions are confirmed completed, you unlock the ability to leave an authentic 1-5 star review!`;
    } else {
      const learningContext = userContext?.learningSkills?.length
        ? ` For your learning focus in **${userContext.learningSkills.join(', ')}**, `
        : ' ';
      answer = `SkillSwap Learning Assistant:\n\nRegarding your question: "${query}".${learningContext}We recommend structuring your learning around short, deliberate practice cycles: understand the concept conceptually, build a small practical proof-of-concept, and bring your specific questions to your next scheduled reciprocal session with your mentor!`;
    }

    const durationMs = Date.now() - start;
    return {
      text: answer,
      promptTokens: Math.ceil(query.length / 4),
      completionTokens: Math.ceil(answer.length / 4),
      model: 'local-deterministic-v1',
      durationMs,
      provider: this.name,
    };
  }
}

