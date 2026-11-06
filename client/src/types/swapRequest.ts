export type SwapRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISPUTED';

export interface SwapRequestUserSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  averageRating: number;
}

export interface SwapRequestSkillSummary {
  id: number;
  name: string;
  category: string;
}

export interface SwapRequest {
  id: number;
  senderId: number;
  receiverId: number;
  senderSkillId: number;
  receiverSkillId: number;
  status: SwapRequestStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  sender: SwapRequestUserSummary;
  receiver: SwapRequestUserSummary;
  senderSkill: SwapRequestSkillSummary;
  receiverSkill: SwapRequestSkillSummary;
  conversationId?: number | null;
}

export interface CreateSwapRequestPayload {
  receiverId: number;
  senderSkillId: number;
  receiverSkillId: number;
  message?: string | null;
}

