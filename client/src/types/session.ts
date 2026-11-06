export type SessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETION_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'RESCHEDULE_PROPOSED'
  | 'REQUESTED';

export interface SessionUserSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface SessionWithDetails {
  id: number;
  swapRequestId: number;
  teacherId: number;
  learnerId: number;
  skillId: number;
  scheduledAt: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  duration: number;
  timezone: string;
  status: SessionStatus;
  meetingProvider: string | null;
  meetingRoomId: string | null;
  meetingUrl: string | null;
  notes: string | null;

  rescheduledBy: number | null;
  proposedAt: string | null;
  proposedStart: string | null;
  proposedEnd: string | null;
  rescheduleReason: string | null;

  completedBy: number | null;
  completedAt: string | null;
  completionConfirmedAt: string | null;

  disputedBy: number | null;
  disputeReason: string | null;

  cancelledBy: number | null;
  cancellationReason: string | null;

  createdAt: string;
  updatedAt: string;

  teacher: SessionUserSummary;
  learner: SessionUserSummary;
  skill: {
    id: number;
    name: string;
    category: string;
  };
  swapRequest?: {
    id: number;
    status: string;
    senderId: number;
    receiverId: number;
    senderSkillId: number;
    receiverSkillId: number;
  };
}

export interface CreateSessionPayload {
  swapRequestId: number;
  teacherId: number;
  learnerId: number;
  skillId: number;
  scheduledStart: string;
  duration: number;
  timezone?: string;
  notes?: string;
}

export interface RescheduleSessionPayload {
  proposedStart: string;
  duration?: number;
  reason?: string;
}

export interface MeetingInfo {
  meetingUrl: string | null;
  meetingRoomId: string | null;
  provider: string;
  joinAllowed: boolean;
  minutesUntilOpen: number;
  status: string;
  session?: SessionWithDetails;
}

