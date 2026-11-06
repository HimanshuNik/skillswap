export type User = {
  id: number;
  username: string;
  name: string;
  initials: string;
  location: string;
  bio: string;
  rating: number;
  completedSessions: number;
  teaches: string[];
  wantsToLearn: string[];
  category: string;
};

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  isOnboarded: boolean;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
  subscriptionTier?: string;
  isSuspended?: boolean;
  suspendedReason?: string | null;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface UserTeachingSkill {
  id: number;
  userId: number;
  skillId: number;
  proficiencyLevel: string;
  skill: Skill;
}

export interface UserLearningSkill {
  id: number;
  userId: number;
  skillId: number;
  targetLevel: string;
  skill: Skill;
}

export interface UserAvailabilitySlot {
  day: string;
  slots: string[];
}

export interface FullProfile {
  user: AuthUser;
  teachingSkills: UserTeachingSkill[];
  learningSkills: UserLearningSkill[];
  availability: UserAvailabilitySlot[];
}

export interface PublicUserProfile {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  createdAt: string;
  teachingSkills: UserTeachingSkill[];
  learningSkills: UserLearningSkill[];
}

export interface DiscoverUser {
  id: number;
  name: string;
  username: string;
  initials: string;
  location: string;
  bio: string;
  avatarUrl: string | null;
  category: string;
  rating: number;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  teaches: string[];
  wantsToLearn: string[];
}

export interface SkillMatch {
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

export interface DiscoverPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

