import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLogout } from '../../hooks/useAuth';
import { usePendingRequestsCount } from '../../hooks/useSwapRequests';
import { useUnreadMessagesCount } from '../../hooks/useConversations';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: '⌂' },
  { name: 'Discover', path: '/discover', icon: '⌕' },
  { name: 'Matches', path: '/matches', icon: '↔' },
  { name: 'Requests', path: '/requests', icon: '📨' },
  { name: 'Messages', path: '/messages', icon: '✉' },
  { name: 'Sessions', path: '/sessions', icon: '◷' },
  { name: 'AI Roadmap', path: '/learning-roadmap', icon: '🗺️' },
  { name: 'Analytics', path: '/learning-analytics', icon: '📊' },
  { name: 'Community', path: '/community', icon: '👥' },
];

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const logout = useLogout();
  const location = useLocation();
  const { data: pendingCount = 0 } = usePendingRequestsCount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation Menu">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex h-[73px] items-center justify-between border-b border-slate-100 px-6">
          <span className="text-2xl font-bold tracking-tight text-slate-950">
            Skill<span className="text-emerald-500">Swap</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* User Mini Profile */}
        {user && (
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">@{user.username}</p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Mobile Navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`
              }
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.name}</span>

              {item.name === 'Requests' && pendingCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingCount}
                </span>
              )}

              {item.name === 'Messages' && unreadMessagesCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadMessagesCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-slate-200 p-4 space-y-1">
          <NavLink
            to="/settings"
            className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <SettingsIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
            Settings
          </NavLink>

          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 disabled:opacity-50"
          >
            <LogOut className="h-5 w-5 text-slate-500" aria-hidden="true" />
            {logout.isPending ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
};

