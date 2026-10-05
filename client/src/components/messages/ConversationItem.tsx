type ConversationItemProps = {
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isActive: boolean;
  onClick: () => void;
};

const ConversationItem = ({
  name,
  initials,
  lastMessage,
  time,
  unreadCount,
  isActive,
  onClick,
}: ConversationItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-b border-slate-100 p-4 text-left transition ${
        isActive
          ? "bg-emerald-50"
          : "bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-slate-950">
              {name}
            </p>

            <span className="shrink-0 text-xs text-slate-400">
              {time}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate text-sm text-slate-500">
              {lastMessage}
            </p>

            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;