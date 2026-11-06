import { z } from 'zod';

export const createGroupSessionSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  topic: z.string().trim().max(100).optional().nullable(),
  startTime: z.string().datetime('Valid start time ISO string is required'),
  endTime: z.string().datetime('Valid end time ISO string is required'),
  timezone: z.string().trim().max(50).default('UTC'),
  maxParticipants: z.number().int().min(2).max(100).default(20),
});

export const updateGroupSessionSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  topic: z.string().trim().max(100).optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().trim().max(50).optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELED']).optional(),
  cancellationReason: z.string().trim().max(500).optional().nullable(),
});

export const updateAttendanceSchema = z.object({
  isVerifiedAttendance: z.boolean().optional(),
  status: z.enum(['REGISTERED', 'ATTENDED', 'ABSENT', 'CANCELLED']).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createGroupResourceSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  resourceType: z.enum(['LINK', 'NOTE', 'FILE', 'IMAGE']),
  url: z.string().url('Must be a valid URL').optional().nullable(),
  content: z.string().max(20000).optional().nullable(), // For NOTE type
  fileName: z.string().max(255).optional().nullable(),
  fileData: z.string().optional().nullable(), // Base64 data if FILE/IMAGE
  mimeType: z.string().max(100).optional().nullable(),
  visibility: z.enum(['MEMBERS', 'PUBLIC']).default('MEMBERS'),
});

export const createGroupTaskSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  assigneeId: z.number().int().positive().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateGroupTaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  assigneeId: z.number().int().positive().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const createGroupMilestoneSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});

export const updateGroupMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'ACHIEVED']).optional(),
  isVerified: z.boolean().optional(),
});

export const createGroupAnnouncementSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  content: z.string().trim().min(5, 'Content must be at least 5 characters').max(5000),
  isPinned: z.boolean().default(false),
});

export const createGroupMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

