import { useState } from "react";

import AppLayout from "../components/app/AppLayout";
import ConversationItem from "../components/messages/ConversationItem";

type Conversation = {
  id: number;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
};

type Message = {
  id: number;
  conversationId: number;
  text: string;
  sender: "me" | "them";
  time: string;
};

const initialConversations: Conversation[] = [
  {
    id: 1,
    name: "Aman Sharma",
    initials: "AS",
    lastMessage: "Sounds good! See you tomorrow.",
    time: "6:42 PM",
    unreadCount: 2,
  },
  {
    id: 2,
    name: "Priya Verma",
    initials: "PV",
    lastMessage: "I'll share the Figma file.",
    time: "4:15 PM",
    unreadCount: 0,
  },
  {
    id: 3,
    name: "Rohan Mehta",
    initials: "RM",
    lastMessage: "Thanks for the React resources!",
    time: "Yesterday",
    unreadCount: 0,
  },
];

const initialMessages: Message[] = [
  {
    id: 1,
    conversationId: 1,
    text: "Hey Aman! Are we still on for tomorrow?",
    sender: "me",
    time: "6:35 PM",
  },
  {
    id: 2,
    conversationId: 1,
    text: "Yes! I'll show you the basics of Premiere Pro.",
    sender: "them",
    time: "6:38 PM",
  },
  {
    id: 3,
    conversationId: 1,
    text: "Perfect. I can help you with React after that.",
    sender: "me",
    time: "6:40 PM",
  },
  {
    id: 4,
    conversationId: 1,
    text: "Sounds good! See you tomorrow.",
    sender: "them",
    time: "6:42 PM",
  },

  {
    id: 5,
    conversationId: 2,
    text: "Hey Priya, thanks for explaining components today.",
    sender: "me",
    time: "4:05 PM",
  },
  {
    id: 6,
    conversationId: 2,
    text: "You're welcome! I'll share the Figma file.",
    sender: "them",
    time: "4:15 PM",
  },

  {
    id: 7,
    conversationId: 3,
    text: "Here are those React resources we discussed.",
    sender: "me",
    time: "Yesterday",
  },
  {
    id: 8,
    conversationId: 3,
    text: "Thanks for the React resources!",
    sender: "them",
    time: "Yesterday",
  },
];

const Messages = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  const selectedMessages = messages.filter(
    (message) => message.conversationId === selectedConversationId,
  );

  const [messageInput, setMessageInput] = useState("");

  const [conversationSearch, setConversationSearch] = useState("");

  const filteredConversations = conversations.filter((conversation) =>
    conversation.name
      .toLowerCase()
      .includes(conversationSearch.toLowerCase().trim()),
  );

  const getLastMessage = (conversationId: number) => {
    const conversationMessages = messages.filter(
      (message) => message.conversationId === conversationId,
    );

    return conversationMessages[conversationMessages.length - 1];
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              unreadCount: 0,
            }
          : conversation,
      ),
    );
  };

  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim();

    if (!trimmedMessage || selectedConversationId === null) {
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      conversationId: selectedConversationId,
      text: trimmedMessage,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((currentMessages) => [...currentMessages, newMessage]);

    setMessageInput("");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Messages</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Conversations
          </h1>

          <div className="mt-8 grid min-h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[320px_1fr]">
            {/* Conversation List */}

            <div className="border-r border-slate-200">
              <div className="border-b border-slate-200 p-4">
                <input
                  type="text"
                  value={conversationSearch}
                  onChange={(event) =>
                    setConversationSearch(event.target.value)
                  }
                  placeholder="Search conversations..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => {
                    const lastMessage = getLastMessage(conversation.id);

                    return (
                      <ConversationItem
                        key={conversation.id}
                        name={conversation.name}
                        initials={conversation.initials}
                        lastMessage={
                          lastMessage?.text ?? conversation.lastMessage
                        }
                        time={lastMessage?.time ?? conversation.time}
                        unreadCount={conversation.unreadCount}
                        isActive={selectedConversationId === conversation.id}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                      />
                    );
                  })
                ) : (
                  <div className="px-4 py-10 text-center">
                    <div className="text-3xl">🔍</div>

                    <p className="mt-3 font-semibold text-slate-800">
                      No conversations found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try searching for another person.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}

            {selectedConversation ? (
              <div className="flex min-w-0 flex-col">
                {/* Chat Header */}

                <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                    {selectedConversation.initials}
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      {selectedConversation.name}
                    </h2>

                    <p className="text-xs text-slate-500">
                      SkillSwap connection
                    </p>
                  </div>
                </div>

                {/* Messages */}

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-5">
                  {selectedMessages.length > 0 ? (
                    selectedMessages.map((message) => {
                      const isMine = message.sender === "me";

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                              isMine
                                ? "rounded-br-md bg-slate-950 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            <p className="text-sm leading-6">{message.text}</p>

                            <p className="mt-1 text-right text-xs text-slate-400">
                              {message.time}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl">👋</div>

                        <p className="mt-4 text-sm text-slate-500">
                          Start your conversation with{" "}
                          {selectedConversation.name}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}

                <div className="border-t border-slate-200 p-4">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-3"
                  >
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      placeholder="Type a message..."
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-4xl">💬</div>

                  <h2 className="mt-4 font-bold text-slate-950">
                    Select a conversation
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    Choose someone from the conversation list to start chatting.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-2 text-slate-500">
            Chat with your SkillSwap connections.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Messages;
