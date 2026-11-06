import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Search, Send, MessageSquare } from 'lucide-react';
import AppLayout from '../components/app/AppLayout';
import ConversationItem from '../components/messages/ConversationItem';
import { useAuthStore } from '../store/useAuthStore';
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationAsRead,
} from '../hooks/useConversations';
import { useChatSocket } from '../hooks/useChatSocket';
import { getSocket } from '../lib/socket';

function formatTime(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const Messages = () => {
  const { user } = useAuthStore();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Queries
  const { data: conversations = [], isLoading: isLoadingConversations } = useConversations();

  // If no conversation was explicitly selected yet, default to first available
  const activeConversationId = selectedConversationId ?? (conversations.length > 0 ? conversations[0].id : null);

  const { data: messagesData, isLoading: isLoadingMessages } =
    useConversationMessages(activeConversationId);

  // Mutations & Real-time Socket
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkConversationAsRead();
  const {
    peerIsTyping,
    peerTypingName,
    sendMessage: sendSocketMessage,
    startTyping,
    stopTyping,
  } = useChatSocket(activeConversationId);

  const selectedConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const messages = messagesData?.messages || [];

  // Scroll to bottom when messages change or conversation switches
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConversationId]);

  const filteredConversations = conversations.filter((conversation) =>
    conversation.peer.name
      .toLowerCase()
      .includes(conversationSearch.toLowerCase().trim())
  );

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setMobileShowChat(true);
    markAsReadMutation.mutate(conversationId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    startTyping();
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleSendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || activeConversationId === null || isSending) return;

    setIsSending(true);
    stopTyping();
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    try {
      const socket = getSocket();
      if (socket.connected) {
        await sendSocketMessage(trimmed);
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: activeConversationId,
          content: trimmed,
        });
      }
      setMessageInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const isReadOnly = selectedConversation?.status === 'READ_ONLY';

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Messages</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Conversations
          </h1>

          <div className="mt-8 flex h-[calc(100vh-240px)] min-h-[560px] max-h-[800px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {/* Conversation List Sidebar */}
            <div
              className={`w-full flex-col border-r border-slate-200 lg:flex lg:w-[340px] shrink-0 ${
                mobileShowChat ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="border-b border-slate-200 p-4">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    value={conversationSearch}
                    onChange={(event) => setConversationSearch(event.target.value)}
                    placeholder="Search conversations..."
                    aria-label="Search conversations"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-28 rounded bg-slate-200" />
                          <div className="h-3 w-40 rounded bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      name={conversation.peer.name}
                      initials={conversation.peer.initials}
                      lastMessage={
                        conversation.latestMessage?.content ||
                        (conversation.swapRequest
                          ? `Swap: ${conversation.swapRequest.senderSkillName} ↔ ${conversation.swapRequest.receiverSkillName}`
                          : 'Conversation started')
                      }
                      time={formatTime(
                        conversation.latestMessage?.createdAt || conversation.updatedAt
                      )}
                      unreadCount={conversation.unreadCount}
                      isActive={activeConversationId === conversation.id}
                      isOnline={conversation.peer.isOnline}
                      onClick={() => handleSelectConversation(conversation.id)}
                    />
                  ))
                ) : (
                  <div className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <p className="mt-3 font-semibold text-slate-800">
                      {conversationSearch ? 'No matches found' : 'No conversations yet'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 max-w-[240px] mx-auto">
                      {conversationSearch
                        ? 'Try searching with a different name.'
                        : 'Accepted skill swaps automatically unlock direct messaging.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            {selectedConversation ? (
              <div
                className={`w-full min-w-0 flex-col bg-white lg:flex flex-1 ${
                  mobileShowChat ? 'flex' : 'hidden lg:flex'
                }`}
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      aria-label="Back to conversations list"
                      className="lg:hidden shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs">
                      {selectedConversation.peer.initials}
                      {selectedConversation.peer.isOnline && (
                        <span
                          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                          title="Online"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-bold text-slate-950">
                          {selectedConversation.peer.name}
                        </h2>
                        {selectedConversation.peer.isOnline && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            Online
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs text-slate-500">
                        {selectedConversation.swapRequest
                          ? `Exchange: ${selectedConversation.swapRequest.senderSkillName} ↔ ${selectedConversation.swapRequest.receiverSkillName}`
                          : 'SkillSwap Connection'}
                      </p>
                    </div>
                  </div>

                  {isReadOnly && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Archived (Read-Only)
                    </span>
                  )}
                </div>

                {/* Messages Body */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 sm:p-5">
                  {isLoadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-sm text-slate-400">Loading messages...</div>
                    </div>
                  ) : messages.length > 0 ? (
                    <>
                      {messages.map((message) => {
                        const isMine = message.senderId === user?.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs ${
                                isMine
                                  ? 'rounded-br-md bg-slate-950 text-white'
                                  : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {message.content}
                              </p>

                              <div
                                className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                                  isMine ? 'text-slate-400' : 'text-slate-400'
                                }`}
                              >
                                <span>{formatTime(message.createdAt)}</span>
                                {isMine && (
                                  <span
                                    title={message.readAt ? `Read ${formatTime(message.readAt)}` : 'Delivered'}
                                    className={message.readAt ? 'text-emerald-400 font-bold' : 'text-slate-500'}
                                  >
                                    {message.readAt ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center px-4">
                        <div className="text-4xl">👋</div>
                        <p className="mt-4 font-semibold text-slate-800">
                          Start the conversation!
                        </p>
                        <p className="mt-1 text-xs text-slate-500 max-w-sm">
                          Say hi to {selectedConversation.peer.name} and coordinate your skill exchange.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Typing Indicator Bar */}
                {peerIsTyping && (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-2 text-xs italic text-emerald-600"
                  >
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                    </span>
                    <span>{peerTypingName || 'Connection'} is typing...</span>
                  </div>
                )}

                {/* Message Input Bar */}
                <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                  {isReadOnly ? (
                    <p className="text-center text-xs text-slate-500 py-2">
                      This conversation is read-only because the skill swap is closed.
                    </p>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      <input
                        type="text"
                        value={messageInput}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        aria-label="Type a message"
                        disabled={isSending}
                        maxLength={2000}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 sm:py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                      />

                      <button
                        type="submit"
                        disabled={!messageInput.trim() || isSending}
                        aria-label="Send message"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">{isSending ? 'Sending...' : 'Send'}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex flex-1 items-center justify-center p-8">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 font-bold text-slate-950">
                    Select a conversation
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose someone from the list to start chatting.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Real-time chat with your SkillSwap connections.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
