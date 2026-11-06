export interface ProfileCompletionItem {
  key: string;
  label: string;
  actionUrl: string;
  completed: boolean;
  weight: number;
}

export interface ProfileCompletion {
  percentage: number;
  completedItems: string[];
  missingItems: Array<{ key: string; label: string; actionUrl: string }>;
  items: ProfileCompletionItem[];
}

export function calculateProfileCompletion(data: {
  user: {
    name?: string | null;
    bio?: string | null;
    location?: string | null;
    avatarUrl?: string | null;
  };
  teachingSkillsCount: number;
  learningSkillsCount: number;
  hasAvailability: boolean;
}): ProfileCompletion {
  const items: ProfileCompletionItem[] = [
    {
      key: 'name',
      label: 'Add your full name',
      actionUrl: '/settings',
      completed: !!data.user.name && data.user.name.trim().length >= 2,
      weight: 15,
    },
    {
      key: 'bio',
      label: 'Write an introduction bio',
      actionUrl: '/settings',
      completed: !!data.user.bio && data.user.bio.trim().length > 0,
      weight: 15,
    },
    {
      key: 'location',
      label: 'Set your location',
      actionUrl: '/settings',
      completed: !!data.user.location && data.user.location.trim().length > 0,
      weight: 10,
    },
    {
      key: 'avatar',
      label: 'Add an avatar image URL',
      actionUrl: '/settings',
      completed: !!data.user.avatarUrl && data.user.avatarUrl.trim().length > 0,
      weight: 15,
    },
    {
      key: 'teachingSkills',
      label: 'List at least one skill you can teach',
      actionUrl: '/settings',
      completed: data.teachingSkillsCount > 0,
      weight: 15,
    },
    {
      key: 'learningSkills',
      label: 'List at least one skill you want to learn',
      actionUrl: '/settings',
      completed: data.learningSkillsCount > 0,
      weight: 15,
    },
    {
      key: 'availability',
      label: 'Set your weekly availability schedule',
      actionUrl: '/settings',
      completed: data.hasAvailability,
      weight: 15,
    },
  ];

  let percentage = 0;
  const completedItems: string[] = [];
  const missingItems: Array<{ key: string; label: string; actionUrl: string }> = [];

  for (const item of items) {
    if (item.completed) {
      percentage += item.weight;
      completedItems.push(item.key);
    } else {
      missingItems.push({
        key: item.key,
        label: item.label,
        actionUrl: item.actionUrl,
      });
    }
  }

  percentage = Math.min(100, percentage);

  return {
    percentage,
    completedItems,
    missingItems,
    items,
  };
}

