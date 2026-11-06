import { db } from '../prisma/db.js';

export interface UserRecord {
  id: number;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  isOnboarded: boolean;
  isActive?: boolean;
  deletedAt?: string | null;
  role?: string;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  suspendedBy?: number | null;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  passwordResetHash: string | null;
  passwordResetExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<UserRecord, 'passwordHash' | 'passwordResetHash' | 'passwordResetExpiresAt'>;

export class UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await db.orm.public.User.where({ email: email.toLowerCase() }).first();
    return user as unknown as UserRecord | null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const user = await db.orm.public.User.where({ username: username.toLowerCase() }).first();
    return user as unknown as UserRecord | null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const user = await db.orm.public.User.where({ id }).first();
    return user as unknown as UserRecord | null;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserRecord | null> {
    const normalized = identifier.toLowerCase();
    const byEmail = await this.findByEmail(normalized);
    if (byEmail) return byEmail;
    return this.findByUsername(normalized);
  }

  async createUser(data: {
    name: string;
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const user = await db.orm.public.User.create({
      name: data.name,
      username: data.username.toLowerCase(),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      isOnboarded: false,
      averageRating: 0,
      totalReviews: 0,
      completedSessions: 0,
    });

    return user as unknown as UserRecord;
  }

  async updatePassword(id: number, passwordHash: string, client: typeof db = db): Promise<void> {
    await client.orm.public.User.where({ id }).update({
      passwordHash,
      passwordResetHash: null,
      passwordResetExpiresAt: null,
    });
  }

  async saveResetToken(id: number, tokenHash: string, expiresAt: string): Promise<void> {
    await db.orm.public.User.where({ id }).update({
      passwordResetHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    });
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserRecord | null> {
    const user = await db.orm.public.User.where({ passwordResetHash: tokenHash }).first();
    return user as unknown as UserRecord | null;
  }

  async clearResetToken(id: number): Promise<void> {
    await db.orm.public.User.where({ id }).update({
      passwordResetHash: null,
      passwordResetExpiresAt: null,
    });
  }

  async updateProfile(
    id: number,
    data: {
      name?: string;
      bio?: string | null;
      location?: string | null;
      avatarUrl?: string | null;
      timezone?: string | null;
    },
    client: typeof db = db
  ): Promise<UserRecord | null> {
    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.bio !== undefined) updatePayload.bio = data.bio;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.avatarUrl !== undefined) updatePayload.avatarUrl = data.avatarUrl;
    if (data.timezone !== undefined) updatePayload.timezone = data.timezone;

    if (Object.keys(updatePayload).length > 0) {
      await client.orm.public.User.where({ id }).update(updatePayload);
    }

    return this.findById(id);
  }

  async setOnboarded(id: number, isOnboarded: boolean, client: typeof db = db): Promise<void> {
    await client.orm.public.User.where({ id }).update({
      isOnboarded,
    });
  }

  async incrementCompletedSessions(id: number, client: typeof db = db): Promise<void> {
    const user = await client.orm.public.User.where({ id }).first();
    if (user) {
      await client.orm.public.User.where({ id }).update({
        completedSessions: ((user as any).completedSessions || 0) + 1,
      });
    }
  }

  async updateReputation(
    id: number,
    data: { averageRating: number; totalReviews: number },
    client: typeof db = db
  ): Promise<void> {
    await client.orm.public.User.where({ id }).update({
      averageRating: data.averageRating,
      totalReviews: data.totalReviews,
    });
  }


  async softDelete(id: number, client: typeof db = db): Promise<void> {
    await client.orm.public.User.where({ id }).update({
      isActive: false,
      deletedAt: new Date().toISOString(),
    });
  }

  async updateRole(id: number, role: string, client: typeof db = db): Promise<void> {
    await client.orm.public.User.where({ id }).update({ role });
  }

  async suspendUser(id: number, reason: string, adminId: number, client: typeof db = db): Promise<void> {
    await client.orm.public.User.where({ id }).update({
      isSuspended: true,
      suspendedAt: new Date().toISOString(),
      suspendedReason: reason,
      suspendedBy: adminId,
    });
  }

  async reactivateUser(id: number, client: typeof db = db): Promise<void> {
    await client.orm.public.User.where({ id }).update({
      isSuspended: false,
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
    });
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    role?: string;
  }): Promise<{ users: SafeUser[]; total: number; totalPages: number }> {
    let allUsers: UserRecord[];

    if (params.status === 'suspended') {
      allUsers = (await db.orm.public.User.where({ isSuspended: true }).all()) as unknown as UserRecord[];
    } else if (params.status === 'deactivated') {
      allUsers = (await db.orm.public.User.where({ isActive: false }).all()) as unknown as UserRecord[];
    } else if (params.role && params.role !== 'all') {
      allUsers = (await db.orm.public.User.where({ role: params.role }).all()) as unknown as UserRecord[];
    } else {
      allUsers = (await db.orm.public.User.all()) as unknown as UserRecord[];
    }

    let filtered = allUsers;

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (params.role && params.role !== 'all') {
      filtered = filtered.filter((u) => (u.role || 'USER') === params.role);
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'suspended') {
        filtered = filtered.filter((u) => u.isSuspended === true);
      } else if (params.status === 'deactivated') {
        filtered = filtered.filter((u) => u.isActive === false);
      } else if (params.status === 'active') {
        filtered = filtered.filter((u) => u.isActive !== false && !u.isSuspended);
      }
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    const offset = (params.page - 1) * params.limit;
    const paginated = filtered.slice(offset, offset + params.limit).map((u) => this.toSafeUser(u));

    return {
      users: paginated,
      total,
      totalPages,
    };
  }

  toSafeUser(user: UserRecord): SafeUser {
    const { passwordHash, passwordResetHash, passwordResetExpiresAt, ...safe } = user;
    return {
      ...safe,
      role: user.role || 'USER',
      isSuspended: Boolean(user.isSuspended),
    };
  }
}

export const userRepository = new UserRepository();

