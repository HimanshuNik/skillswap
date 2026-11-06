import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupResourceRecord {
  id: number;
  groupId: number;
  uploaderId: number;
  title: string;
  description: string | null;
  resourceType: string; // LINK, NOTE, FILE, IMAGE
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  visibility: string; // MEMBERS, PUBLIC
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupResourceWithUploader extends GroupResourceRecord {
  uploader: AuthorSummary;
}

export class GroupResourceRepository {
  async create(data: {
    groupId: number;
    uploaderId: number;
    title: string;
    description?: string | null;
    resourceType: string;
    url?: string | null;
    filePath?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    visibility?: string;
  }): Promise<GroupResourceRecord> {
    const resource = await db.orm.public.GroupResource.create({
      groupId: data.groupId,
      uploaderId: data.uploaderId,
      title: data.title,
      description: data.description ?? null,
      resourceType: data.resourceType,
      url: data.url ?? null,
      filePath: data.filePath ?? null,
      fileName: data.fileName ?? null,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType ?? null,
      visibility: data.visibility || 'MEMBERS',
      downloadCount: 0,
    });

    return resource as unknown as GroupResourceRecord;
  }

  async findById(id: number): Promise<GroupResourceRecord | null> {
    const res = await db.orm.public.GroupResource.where({ id }).first();
    return (res as unknown as GroupResourceRecord) || null;
  }

  async findByGroup(
    groupId: number,
    options?: { resourceType?: string; search?: string }
  ): Promise<GroupResourceRecord[]> {
    let list = (await db.orm.public.GroupResource.where({
      groupId,
    }).all()) as unknown as GroupResourceRecord[];

    if (options?.resourceType) {
      list = list.filter((r) => r.resourceType === options.resourceType);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      url: string | null;
      visibility: string;
    }>
  ): Promise<GroupResourceRecord | null> {
    const updated = await db.orm.public.GroupResource.where({ id }).update(data);
    return (updated as unknown as GroupResourceRecord) || null;
  }

  async incrementDownloadCount(id: number): Promise<void> {
    const current = await this.findById(id);
    if (current) {
      await db.orm.public.GroupResource.where({ id }).update({
        downloadCount: (current.downloadCount || 0) + 1,
      });
    }
  }

  async delete(id: number): Promise<boolean> {
    await db.orm.public.GroupResource.where({ id }).delete();
    return true;
  }

  async enrichWithUploader(item: GroupResourceRecord): Promise<GroupResourceWithUploader> {
    const uploader = await userRepository.findById(item.uploaderId);
    return {
      ...item,
      uploader: {
        id: uploader?.id || item.uploaderId,
        name: uploader?.name || 'Member',
        username: uploader?.username || 'member',
        avatarUrl: uploader?.avatarUrl || null,
      },
    };
  }
}

export const groupResourceRepository = new GroupResourceRepository();

