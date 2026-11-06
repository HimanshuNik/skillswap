type ConversationItemProps = {
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isActive: boolean;
  isOnline?: boolean;
  onClick: () => void;
};

const ConversationItem = ({
  name,
  initials,
  lastMessage,
  time,
  unreadCount,
  isActive,
  isOnline,
  onClick,
}: ConversationItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-b border-slate-100 p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        isActive
          ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600'
          : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs">
          {initials}
          {isOnline && (
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
              title="Online"
            />
          )}
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
              {lastMessage || 'No messages yet'}
            </p>

            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white shadow-xs">
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
