export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  readAt: string | null;
  clientMessageId?: string;
}

export interface ConversationPeer {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  isOnline?: boolean;
}

export interface ConversationSwapRequest {
  id: number;
  status: string;
  senderSkillName: string;
  receiverSkillName: string;
}

export interface ConversationRecord {
  id: number;
  swapRequestId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessagesResponse {
  conversation: ConversationRecord | null;
  messages: ChatMessage[];
}

export interface ConversationSummary {
  id: number;
  swapRequestId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string | null;
  unreadCount: number;
  peer: ConversationPeer;
  swapRequest?: ConversationSwapRequest | null;
  latestMessage?: ChatMessage | null;
}

export interface SendMessagePayload {
  content: string;
  clientMessageId?: string;
}

export interface TypingUpdateEvent {
  conversationId: number;
  userId: number;
  isTyping: boolean;
  user?: {
    id: number;
    name: string;
  };
}

export interface PresenceUpdateEvent {
  userId: number;
  isOnline: boolean;
}

export interface MessageAckEvent {
  clientMessageId?: string;
  message: ChatMessage;
}

export interface MessageReadAckEvent {
  conversationId: number;
  readerId: number;
  lastReadAt: string;
}

