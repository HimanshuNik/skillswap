import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, ArrowLeftRight, Inbox, MessageSquare } from 'lucide-react';
import { usePendingRequestsCount } from '../../hooks/useSwapRequests';
import { useUnreadMessagesCount } from '../../hooks/useConversations';

export const MobileBottomBar: React.FC = () => {
  const { data: pendingCount = 0 } = usePendingRequestsCount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();

  const tabs = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Matches', path: '/matches', icon: ArrowLeftRight },
    { name: 'Requests', path: '/requests', icon: Inbox, badge: pendingCount },
    { name: 'Chat', path: '/messages', icon: MessageSquare, badge: unreadMessagesCount },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 block border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden shadow-lg"
      aria-label="Mobile Bottom Bar"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                `relative flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 transition ${
                  isActive
                    ? 'text-emerald-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`
              }
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

