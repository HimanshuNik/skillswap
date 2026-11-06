import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  groupResourceRepository,
  type GroupResourceRecord,
  type GroupResourceWithUploader,
} from '../../repositories/collaboration/groupResource.repository.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../utils/errors.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'group-resources');

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'text/markdown': '.md',
  'text/plain': '.txt',
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates file magic bytes to prevent MIME-spoofing and polyglot executable uploads.
 */
export function validateFileMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false;

  // PNG: 89 50 4E 47
  if (mime === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  // JPEG: FF D8 FF
  if (mime === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // WEBP: RIFF ... WEBP
  if (mime === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  // PDF: %PDF-
  if (mime === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  // Text / Markdown: Disallow executable binary signatures (Windows PE 'MZ' or Linux ELF)
  if (mime === 'text/plain' || mime === 'text/markdown') {
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) return false;
    if (buffer[0] === 0x7f && buffer.subarray(1, 4).toString('ascii') === 'ELF') return false;
    return true;
  }
  return true;
}

export class GroupResourceService {
  constructor() {
    // Ensure upload directory exists
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
    } catch {
      // directory handling
    }
  }

  async createResource(
    groupId: number,
    uploaderId: number,
    data: {
      title: string;
      description?: string | null;
      resourceType: 'LINK' | 'NOTE' | 'FILE' | 'IMAGE';
      url?: string | null;
      content?: string | null;
      fileName?: string | null;
      fileData?: string | null; // Base64 encoded payload
      mimeType?: string | null;
      visibility?: 'MEMBERS' | 'PUBLIC';
    }
  ): Promise<GroupResourceRecord> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, uploaderId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active group member to share resources');
    }

    let filePath: string | null = null;
    let finalFileName = data.fileName ?? null;
    let finalMimeType = data.mimeType ?? null;
    let finalFileSize: number | null = null;
    let finalUrl = data.url ?? null;

    if (data.resourceType === 'LINK') {
      if (!data.url) {
        throw new BadRequestError('URL is required for external link resources');
      }
    } else if (data.resourceType === 'NOTE') {
      // Notes can store text in description or url/content
      if (!data.content && !data.description) {
        throw new BadRequestError('Content or description is required for notes');
      }
    } else if (data.resourceType === 'FILE' || data.resourceType === 'IMAGE') {
      if (!data.fileData) {
        throw new BadRequestError('File data is required for upload resources');
      }

      // Check MIME type
      const mime = data.mimeType || 'application/octet-stream';
      if (!ALLOWED_MIME_TYPES[mime]) {
        throw new BadRequestError(
          `Unsupported file type: ${mime}. Allowed types: PDF, PNG, JPG, WebP, Markdown, Text.`
        );
      }

      // Decode base64
      let buffer: Buffer;
      try {
        const base64Data = data.fileData.includes('base64,')
          ? data.fileData.split('base64,')[1]
          : data.fileData;
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        throw new BadRequestError('Invalid base64 file data');
      }

      finalFileSize = buffer.length;
      if (finalFileSize > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestError('File size exceeds the 10MB limit');
      }

      // Verify file header signature (magic bytes) against declared MIME type
      if (!validateFileMagicBytes(buffer, mime)) {
        throw new BadRequestError('File signature does not match claimed MIME type');
      }

      // Prevent path traversal: sanitize filename and generate unique storage name
      const ext = ALLOWED_MIME_TYPES[mime];
      const safeRandomName = `${crypto.randomUUID()}${ext}`;
      const destinationPath = path.join(UPLOAD_DIR, safeRandomName);

      // Verify destination is inside UPLOAD_DIR
      if (!destinationPath.startsWith(UPLOAD_DIR)) {
        throw new BadRequestError('Invalid file storage destination');
      }

      fs.writeFileSync(destinationPath, buffer);
      filePath = safeRandomName; // store relative name
      finalFileName = path.basename(data.fileName || `file${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      finalMimeType = mime;
    }

    const resource = await groupResourceRepository.create({
      groupId,
      uploaderId,
      title: data.title,
      description: data.description || (data.resourceType === 'NOTE' ? data.content : null),
      resourceType: data.resourceType,
      url: finalUrl,
      filePath,
      fileName: finalFileName,
      fileSize: finalFileSize,
      mimeType: finalMimeType,
      visibility: data.visibility || 'MEMBERS',
    });

    return resource;
  }

  async listResources(
    groupId: number,
    userId?: number,
    options?: { resourceType?: string; search?: string }
  ): Promise<GroupResourceWithUploader[]> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    if (group.visibility === 'PRIVATE') {
      if (!userId) {
        throw new ForbiddenError('Authentication required to view private group resources');
      }
      const membership = await studyGroupMemberRepository.findMember(groupId, userId);
      if (!membership || membership.status !== 'ACTIVE') {
        throw new ForbiddenError('You are not authorized to view resources in this group');
      }
    }

    const list = await groupResourceRepository.findByGroup(groupId, options);
    const results: GroupResourceWithUploader[] = [];
    for (const item of list) {
      results.push(await groupResourceRepository.enrichWithUploader(item));
    }
    return results;
  }

  async getResourceDownload(
    groupId: number,
    resourceId: number,
    userId: number
  ): Promise<{
    absolutePath: string;
    fileName: string;
    mimeType: string;
  }> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active group member to download resources');
    }

    const resource = await groupResourceRepository.findById(resourceId);
    if (!resource || resource.groupId !== groupId) {
      throw new NotFoundError('Resource not found');
    }

    if (!resource.filePath) {
      throw new BadRequestError('This resource is not a downloadable file');
    }

    // Path traversal check
    const safeFilePath = path.join(UPLOAD_DIR, path.basename(resource.filePath));
    if (!fs.existsSync(safeFilePath)) {
      throw new NotFoundError('File does not exist on disk');
    }

    await groupResourceRepository.incrementDownloadCount(resourceId);

    return {
      absolutePath: safeFilePath,
      fileName: resource.fileName || 'download',
      mimeType: resource.mimeType || 'application/octet-stream',
    };
  }

  async deleteResource(groupId: number, resourceId: number, userId: number): Promise<boolean> {
    const resource = await groupResourceRepository.findById(resourceId);
    if (!resource || resource.groupId !== groupId) {
      throw new NotFoundError('Resource not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    const isOwnerOrMod =
      membership &&
      membership.status === 'ACTIVE' &&
      (membership.role === 'OWNER' || membership.role === 'MODERATOR');

    if (resource.uploaderId !== userId && !isOwnerOrMod) {
      throw new ForbiddenError('Only the uploader or group moderators can delete this resource');
    }

    // Clean up local disk file if present
    if (resource.filePath) {
      try {
        const fullPath = path.join(UPLOAD_DIR, path.basename(resource.filePath));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch {
        // ignore disk deletion error
      }
    }

    return groupResourceRepository.delete(resourceId);
  }
}

export const groupResourceService = new GroupResourceService();

