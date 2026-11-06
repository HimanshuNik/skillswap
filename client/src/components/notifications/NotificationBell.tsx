import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationSocket,
} from '../../hooks/useNotifications';
import type { Notification } from '../../types/notification';

function formatRelativeTime(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time socket sync
  useNotificationSocket();

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: notificationData, isLoading } = useNotifications(false, 1);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationData?.notifications || [];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      markRead.mutate(n.id);
    }
    setIsOpen(false);
    if (n.linkUrl) {
      navigate(n.linkUrl);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus:outline-none"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-950 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-2xl">🔕</span>
                <p className="mt-2 text-xs font-semibold text-slate-700">No notifications yet</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  You will receive updates here for swaps, sessions, and messages.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition hover:bg-slate-50 ${
                    !n.isRead ? 'bg-emerald-50/30' : 'bg-white'
                  }`}
                >
                  <div className="mt-0.5">
                    {!n.isRead ? (
                      <span className="block h-2 w-2 rounded-full bg-emerald-600" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs ${
                        !n.isRead ? 'font-bold text-slate-950' : 'font-medium text-slate-700'
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

