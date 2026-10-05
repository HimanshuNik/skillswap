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