import type { Request, Response } from 'express';
import { StudyGroupService } from '../services/community/studyGroup.service.js';
import {
  createGroupSchema,
  updateGroupSchema,
  groupMemberActionSchema,
} from '../validators/community.validator.js';

export class StudyGroupController {
  constructor(private studyGroupService: StudyGroupService = new StudyGroupService()) {}

  createGroup = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const validated = createGroupSchema.parse(req.body);

    const group = await this.studyGroupService.createGroup(userId, validated);
    res.status(201).json({ success: true, data: { group } });
  };

  getGroupById = async (req: Request, res: Response): Promise<void> => {
    const groupId = parseInt(req.params.id as string, 10);
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const group = await this.studyGroupService.getGroupById(groupId, currentUserId, userRole);
    res.json({ success: true, data: { group } });
  };

  getGroupBySlug = async (req: Request, res: Response): Promise<void> => {
    const slug = req.params.slug as string;
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const group = await this.studyGroupService.getGroupBySlug(slug, currentUserId, userRole);
    res.json({ success: true, data: { group } });
  };

  listGroups = async (req: Request, res: Response): Promise<void> => {
    const currentUserId = req.user?.id;
    const skillId = req.query.skillId ? parseInt(req.query.skillId as string, 10) : undefined;
    const visibility = req.query.visibility as string | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await this.studyGroupService.listGroups(
      { skillId, visibility, search, page, limit },
      currentUserId
    );

    res.json({
      success: true,
      data: {
        groups: result.groups,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  };

  getUserGroups = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const groups = await this.studyGroupService.getUserGroups(userId);
    res.json({ success: true, data: { groups } });
  };

  joinPublicGroup = async (req: Request, res: Response): Promise<void> => {
    const groupId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    const member = await this.studyGroupService.joinPublicGroup(groupId, userId);
    res.json({
      success: true,
      message: 'Joined study group successfully',
      data: { member },
    });
  };

  requestJoinPrivateGroup = async (req: Request, res: Response): Promise<void> => {
    const groupId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    const member = await this.studyGroupService.requestJoinPrivateGroup(groupId, userId);
    res.json({
      success: true,
      message: 'Membership request submitted. The group owner will review your request.',
      data: { member },
    });
  };

  handleMemberAction = async (req: Request, res: Response): Promise<void> => {
    const groupId = parseInt(req.params.id as string, 10);
    const actorId = req.user!.id;
    const actorRole = req.user!.role;
    const validated = groupMemberActionSchema.parse(req.body);

    const result = await this.studyGroupService.handleMemberAction(
      groupId,
      actorId,
      validated.userId,
      validated.action,
      actorRole
    );

    res.json(result);
  };

  leaveGroup = async (req: Request, res: Response): Promise<void> => {
    const groupId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;

    const result = await this.studyGroupService.leaveGroup(groupId, userId);
    res.json(result);
  };

  getMembers = async (req: Request, res: Response): Promise<void> => {
    const groupId = parseInt(req.params.id as string, 10);
    const status = (req.query.status as string) || 'ACTIVE';
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const members = await this.studyGroupService.getMembers(groupId, status, currentUserId, userRole);
    res.json({ success: true, data: { members } });
  };
}

