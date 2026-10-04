export type SkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export type LearningLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced";

export type TeachingSkill = {
  name: string;
  level: SkillLevel;
};

export type LearningSkill = {
  name: string;
  targetLevel: LearningLevel;
};

export type ProfileData = {
  displayName: string;
  bio: string;
  location: string;
};

export type TimeSlot =
  | "Morning"
  | "Afternoon"
  | "Evening";

export type DayAvailability = {
  day: string;
  slots: TimeSlot[];
};

export type SessionLength = 30 | 60 | 90;

export type AvailabilityData = {
  schedule: DayAvailability[];
  sessionLength: SessionLength;
  timezone: string;
};

export type OnboardingData = {
  profile: ProfileData;
  teachingSkills: TeachingSkill[];
  learningSkills: LearningSkill[];
  availability: AvailabilityData;
};