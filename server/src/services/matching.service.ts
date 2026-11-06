export interface MatchUserContext {
  id: number;
  name: string;
  username: string;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  teachingSkills: Array<{ id: number; name: string; category: string; level?: string }>;
  learningSkills: Array<{ id: number; name: string; category: string; targetLevel?: string }>;
  availability: Array<{ day: string; slots: string[] }>;
}

export interface MatchResult {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
    location: string | null;
    bio: string | null;
    avatarUrl: string | null;
    averageRating: number;
    totalReviews: number;
    completedSessions: number;
  };
  compatibilityScore: number;
  isReciprocal: boolean;
  skillCompatibility: number;
  availabilityMatch: number;
  reputationScore: number;
  theyCanTeachYou: string[];
  youCanTeachThem: string[];
  matchingDays: string[];
  explanation: string;
}

/**
 * Calculates deterministic compatibility score between two users according to PLAN.md formula:
 * Score = (SkillCompatibility * 0.60) + (AvailabilityOverlap * 0.25) + (ReputationScore * 0.15)
 * Non-reciprocal matches capped at 30%.
 */
export function calculateMatchScore(
  currentUser: MatchUserContext,
  candidate: MatchUserContext
): MatchResult | null {
  if (currentUser.id === candidate.id) {
    return null;
  }

  // 1. Skill Intersections
  const candidateTeachingNames = new Set(
    candidate.teachingSkills.map((s) => s.name.trim().toLowerCase())
  );
  const candidateLearningNames = new Set(
    candidate.learningSkills.map((s) => s.name.trim().toLowerCase())
  );

  // What candidate teaches that current user wants to learn
  const theyCanTeachYou = currentUser.learningSkills
    .filter((l) => candidateTeachingNames.has(l.name.trim().toLowerCase()))
    .map((s) => s.name);

  // What current user teaches that candidate wants to learn
  const youCanTeachThem = currentUser.teachingSkills
    .filter((t) => candidateLearningNames.has(t.name.trim().toLowerCase()))
    .map((s) => s.name);

  const isReciprocal = theyCanTeachYou.length > 0 && youCanTeachThem.length > 0;

  // If no skill connection at all, no match
  if (theyCanTeachYou.length === 0 && youCanTeachThem.length === 0) {
    return null;
  }

  // 2. Skill Compatibility (0 - 100)
  let skillCompatibility = 0;
  if (isReciprocal) {
    // Reciprocal baseline: 90 points, +5 for each additional matched skill up to 100
    const extraMatches = Math.max(0, theyCanTeachYou.length - 1) + Math.max(0, youCanTeachThem.length - 1);
    skillCompatibility = Math.min(100, 90 + extraMatches * 5);
  } else {
    // Non-reciprocal: capped at 30 points
    skillCompatibility = 25;
  }

  // 3. Availability Overlap (0 - 100)
  const currentSlots = new Set<string>();
  for (const day of currentUser.availability || []) {
    for (const slot of day.slots || []) {
      currentSlots.add(`${day.day}_${slot}`);
    }
  }

  const candidateSlots = new Set<string>();
  const matchingDaySet = new Set<string>();
  let overlapCount = 0;

  for (const day of candidate.availability || []) {
    for (const slot of day.slots || []) {
      const key = `${day.day}_${slot}`;
      candidateSlots.add(key);
      if (currentSlots.has(key)) {
        overlapCount++;
        matchingDaySet.add(day.day);
      }
    }
  }

  let availabilityMatch = 50; // Neutral baseline if either user has not specified availability
  if (currentSlots.size > 0 && candidateSlots.size > 0) {
    const minSlots = Math.min(currentSlots.size, candidateSlots.size);
    availabilityMatch = Math.min(100, Math.round((overlapCount / minSlots) * 100));
  }

  // 4. Reputation Score (0 - 100)
  let reputationScore = 70; // Neutral baseline for zero reviews
  if (candidate.totalReviews > 0) {
    reputationScore = Math.min(100, Math.max(0, Math.round((candidate.averageRating / 5.0) * 100)));
  }

  // 5. Overall Weighted Formula
  const rawScore =
    skillCompatibility * 0.6 + availabilityMatch * 0.25 + reputationScore * 0.15;

  const compatibilityScore = isReciprocal
    ? Math.min(100, Math.max(1, Math.round(rawScore)))
    : Math.min(30, Math.max(1, Math.round(rawScore))); // Cap non-reciprocal matches at 30%

  const matchingDays = Array.from(matchingDaySet);

  // 6. Natural Language Explanation
  let explanation = '';
  if (isReciprocal) {
    explanation = `Excellent two-way match! ${candidate.name} can teach you ${theyCanTeachYou.join(
      ', '
    )}, and you can teach them ${youCanTeachThem.join(', ')} in return.`;
    if (matchingDays.length > 0) {
      explanation += ` You both share availability on ${matchingDays.join(', ')}.`;
    }
  } else if (theyCanTeachYou.length > 0) {
    explanation = `One-way match: ${candidate.name} can teach you ${theyCanTeachYou.join(
      ', '
    )}, but they are not currently seeking your teaching skills.`;
  } else {
    explanation = `One-way match: You can teach ${candidate.name} ${youCanTeachThem.join(
      ', '
    )}, but they do not currently teach skills you are seeking.`;
  }

  return {
    id: candidate.id,
    userId: candidate.id,
    user: {
      id: candidate.id,
      name: candidate.name,
      username: candidate.username,
      location: candidate.location,
      bio: candidate.bio,
      avatarUrl: candidate.avatarUrl,
      averageRating: candidate.averageRating,
      totalReviews: candidate.totalReviews,
      completedSessions: candidate.completedSessions,
    },
    compatibilityScore,
    isReciprocal,
    skillCompatibility,
    availabilityMatch,
    reputationScore,
    theyCanTeachYou,
    youCanTeachThem,
    matchingDays,
    explanation,
  };
}
