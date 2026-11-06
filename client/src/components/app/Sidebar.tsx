import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useLogout } from "../../hooks/useAuth";
import { usePendingRequestsCount } from "../../hooks/useSwapRequests";
import { useUnreadMessagesCount } from "../../hooks/useConversations";

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: "⌂",
  },
  {
    name: "Discover",
    path: "/discover",
    icon: "⌕",
  },
  {
    name: "Matches",
    path: "/matches",
    icon: "↔",
  },
  {
    name: "Requests",
    path: "/requests",
    icon: "📨",
  },
  {
    name: "Messages",
    path: "/messages",
    icon: "✉",
  },
  {
    name: "Sessions",
    path: "/sessions",
    icon: "◷",
  },
  {
    name: "AI Roadmap",
    path: "/learning-roadmap",
    icon: "🗺️",
  },
  {
    name: "Analytics",
    path: "/learning-analytics",
    icon: "📊",
  },
  {
    name: "Community",
    path: "/community",
    icon: "👥",
  },
];

const Sidebar = () => {
  const { user } = useAuthStore();
  const logout = useLogout();
  const { data: pendingCount = 0 } = usePendingRequestsCount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const hasAdminAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-full min-h-screen flex-col">

        <div className="border-b border-slate-100 px-6 py-5">
          <span className="text-2xl font-bold tracking-tight text-slate-950">
            Skill<span className="text-emerald-500">Swap</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`
              }
            >
              <span className="text-lg">
                {item.icon}
              </span>

              <span className="flex-1">{item.name}</span>

              {item.name === "Requests" && pendingCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingCount}
                </span>
              )}

              {item.name === "Messages" && unreadMessagesCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadMessagesCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-1">
          {hasAdminAccess && (
            <NavLink
              to="/admin"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200"
            >
              <span>🛡️</span>
              <span className="flex-1">Admin Center</span>
            </NavLink>
          )}

          <NavLink
            to="/settings/billing"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`
            }
          >
            <span>💳</span>
            Billing & Plans
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`
            }
          >
            <span>⚙</span>
            Settings
          </NavLink>

          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span>{logout.isPending ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
