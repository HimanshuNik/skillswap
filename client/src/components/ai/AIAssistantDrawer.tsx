import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User } from "lucide-react";
import { aiApi, type AIAssistantMessage } from "../../lib/aiApi";
import { toast } from "sonner";

interface AIAssistantDrawerProps {
  initialTopic?: string;
  initialSkill?: string;
}

const STARTER_PROMPTS = [
  "How should I prepare for my upcoming skill exchange session?",
  "What questions should I ask my mentor during our meeting?",
  "Suggest a 4-week practice schedule for my learning goals.",
  "How can I effectively teach what I know to a beginner?",
];

export const AIAssistantDrawer = ({ initialTopic, initialSkill }: AIAssistantDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIAssistantMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your SkillSwap Learning Assistant. I can help you prepare for sessions, structure your learning practice, or suggest key questions to ask your skill partners. What are you working on today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestedFollowUps: [
        "Help me prepare for my next session",
        "How do I set clear learning goals?",
        "Suggest practical project ideas",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    const userMessage: AIAssistantMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await aiApi.chatAssistant(question, {
        sessionTopic: initialTopic,
        targetSkill: initialSkill,
      });

      const assistantMessage: AIAssistantMessage = {
        role: "assistant",
        content: res.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedFollowUps: res.data.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to reach AI Assistant. Please try again.";
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I encountered an issue processing your request. Please try again or ask a different question.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open AI Learning Assistant"
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-white shadow-xl transition-all hover:bg-slate-800 hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-wide">AI Assistant</span>
      </button>

      {/* Assistant Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="SkillSwap AI Assistant"
          className="fixed bottom-24 right-4 z-50 flex h-[520px] w-[90vw] max-w-[400px] flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all sm:bottom-20 sm:right-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-4 text-white rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-bold shadow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  SkillSwap AI
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Smart
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Personalized Learning & Mentorship</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1 ${
                      msg.role === "user" ? "text-emerald-200 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </span>

                  {/* Follow-up suggestions */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="mt-3 border-t border-slate-200/60 pt-2 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500">Suggested questions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedFollowUps.map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleSend(prompt)}
                            disabled={isLoading}
                            className="text-left rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 disabled:opacity-50"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2.5 text-slate-400">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse delay-150" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse delay-300" />
                  <span className="ml-1 text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips (when 1 message) */}
          {messages.length === 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs font-semibold text-slate-400 mb-2">Try asking:</p>
              <div className="flex flex-col gap-1.5">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-left rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t border-slate-100 p-3 bg-white rounded-b-3xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask learning assistant..."
                disabled={isLoading}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              🔒 Privacy-first: Guardrailed against credential and data leaks.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
