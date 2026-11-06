import { skillAliasRepository } from '../../repositories/skillAlias.repository.js';
import { getAIProvider } from './aiProvider.factory.js';
import { logger } from '../../config/logger.js';

export interface SkillSimilarityResult {
  skillA: string;
  skillB: string;
  similarity: number;
  relationship: 'EXACT' | 'ALIAS' | 'RELATED' | 'UNRELATED';
  isCanonicalMatch: boolean;
  canonicalSkillA?: { id: number; name: string };
  canonicalSkillB?: { id: number; name: string };
  explanation: string;
}

export class SkillSimilarityService {
  /**
   * Resolves a skill string to its canonical skill record from database catalog or approved alias.
   */
  async resolveSkill(skillName: string) {
    return skillAliasRepository.resolveCanonicalSkill(skillName);
  }

  /**
   * Analyzes semantic similarity between two skill terms.
   * Differentiates exact matches, approved aliases, related skills, and unrelated skills.
   */
  async analyzeSimilarity(skillA: string, skillB: string): Promise<SkillSimilarityResult> {
    const cleanA = skillA.trim();
    const cleanB = skillB.trim();

    // 1. Exact case-insensitive match
    if (cleanA.toLowerCase() === cleanB.toLowerCase()) {
      const canonical = await this.resolveSkill(cleanA);
      return {
        skillA: cleanA,
        skillB: cleanB,
        similarity: 1.0,
        relationship: 'EXACT',
        isCanonicalMatch: true,
        canonicalSkillA: canonical || undefined,
        canonicalSkillB: canonical || undefined,
        explanation: `Exact match for "${cleanA}".`,
      };
    }

    // 2. Check canonical resolution via approved aliases
    const canonicalA = await this.resolveSkill(cleanA);
    const canonicalB = await this.resolveSkill(cleanB);

    if (canonicalA && canonicalB && canonicalA.id === canonicalB.id) {
      return {
        skillA: cleanA,
        skillB: cleanB,
        similarity: 0.95,
        relationship: 'ALIAS',
        isCanonicalMatch: true,
        canonicalSkillA: canonicalA,
        canonicalSkillB: canonicalB,
        explanation: `Approved alias: "${cleanA}" and "${cleanB}" resolve to canonical skill "${canonicalA.name}".`,
      };
    }

    // 3. Fall back to AI Provider semantic similarity
    const provider = getAIProvider();
    const rawScore = await provider.calculateSemanticSimilarity(cleanA, cleanB);
    const similarity = Math.round(rawScore * 100) / 100;

    let relationship: 'EXACT' | 'ALIAS' | 'RELATED' | 'UNRELATED' = 'UNRELATED';
    let explanation = '';

    if (similarity >= 0.85) {
      relationship = 'ALIAS';
      explanation = `High semantic similarity (${similarity * 100}%) between "${cleanA}" and "${cleanB}".`;
    } else if (similarity >= 0.45) {
      relationship = 'RELATED';
      explanation = `Related skills (${similarity * 100}%): "${cleanA}" and "${cleanB}" belong to adjacent knowledge domains, but require separate mastery.`;
    } else {
      relationship = 'UNRELATED';
      explanation = `Unrelated skills (${similarity * 100}%): "${cleanA}" and "${cleanB}" are distinct subject areas.`;
    }

    return {
      skillA: cleanA,
      skillB: cleanB,
      similarity,
      relationship,
      isCanonicalMatch: false,
      canonicalSkillA: canonicalA || undefined,
      canonicalSkillB: canonicalB || undefined,
      explanation,
    };
  }
}

export const skillSimilarityService = new SkillSimilarityService();

