import { db } from '../prisma/db.js';

export interface PlatformSettingRecord {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updatedBy: number | null;
  updatedAt: string;
}

export const DEFAULT_PLATFORM_SETTINGS: Record<string, { value: string; description: string }> = {
  registration_enabled: {
    value: 'true',
    description: 'Allow new user registrations on the platform',
  },
  maintenance_mode: {
    value: 'false',
    description: 'Put SkillSwap into read-only maintenance mode',
  },
  maintenance_message: {
    value: 'SkillSwap is undergoing scheduled maintenance. We will be back shortly!',
    description: 'Public banner displayed during maintenance mode',
  },
  email_notifications_enabled: {
    value: 'true',
    description: 'Globally dispatch transactional emails for swaps and sessions',
  },
  max_reports_per_hour: {
    value: '5',
    description: 'Maximum reports a single authenticated user can submit per hour',
  },
  skill_categories: {
    value: JSON.stringify(['Programming', 'Design', 'Languages', 'Music', 'Business', 'Marketing', 'Photography', 'Writing', 'Fitness', 'Cooking']),
    description: 'List of standard skill categories',
  },
};

export class PlatformSettingRepository {
  async get(key: string): Promise<string | null> {
    const setting = await db.orm.public.PlatformSetting.where({ key }).first();
    if (setting) {
      return (setting as unknown as PlatformSettingRecord).value;
    }
    return DEFAULT_PLATFORM_SETTINGS[key]?.value ?? null;
  }

  async getAll(): Promise<Record<string, { value: string; description: string | null; updatedAt?: string }>> {
    const existing = (await db.orm.public.PlatformSetting.all()) as unknown as PlatformSettingRecord[];
    const result: Record<string, { value: string; description: string | null; updatedAt?: string }> = {};

    // Start with defaults
    for (const [k, v] of Object.entries(DEFAULT_PLATFORM_SETTINGS)) {
      result[k] = {
        value: v.value,
        description: v.description,
      };
    }

    // Overlay persisted settings
    for (const s of existing) {
      result[s.key] = {
        value: s.value,
        description: s.description || DEFAULT_PLATFORM_SETTINGS[s.key]?.description || null,
        updatedAt: s.updatedAt,
      };
    }

    return result;
  }

  async set(key: string, value: string, updatedBy?: number | null, description?: string): Promise<PlatformSettingRecord> {
    const existing = await db.orm.public.PlatformSetting.where({ key }).first();

    if (existing) {
      const updated = await db.orm.public.PlatformSetting.where({ key }).update({
        value,
        updatedBy: updatedBy ?? null,
        description: description ?? (existing as any).description,
      });
      return updated as unknown as PlatformSettingRecord;
    }

    const created = await db.orm.public.PlatformSetting.create({
      key,
      value,
      description: description ?? DEFAULT_PLATFORM_SETTINGS[key]?.description ?? null,
      updatedBy: updatedBy ?? null,
    });
    return created as unknown as PlatformSettingRecord;
  }
}

export const platformSettingRepository = new PlatformSettingRepository();

