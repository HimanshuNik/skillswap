import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, ChevronDown, User, Mail, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useLogout } from "../../hooks/useAuth";
import { useUnreadMessagesCount } from "../../hooks/useConversations";
import { NotificationBell } from "../notifications/NotificationBell";

interface AppHeaderProps {
  onOpenMobileMenu?: () => void;
}

const AppHeader = ({ onOpenMobileMenu }: AppHeaderProps) => {
  const { user } = useAuthStore();
  const logoutMutation = useLogout();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || "SkillSwapper";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SS";

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="flex h-[73px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile hamburger menu toggle & logo */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          )}

          {/* Mobile brand text */}
          <Link
            to="/dashboard"
            className="text-xl font-bold tracking-tight text-slate-950 lg:hidden"
          >
            Skill<span className="text-emerald-500">Swap</span>
          </Link>

          {/* Desktop Community subtitle */}
          <p className="hidden text-sm font-medium text-slate-500 lg:block">
            SkillSwap Peer Community
          </p>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationBell />

          <div className="hidden h-8 border-l border-slate-200 sm:block" />

          {/* User profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="User account menu"
              className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white sm:h-10 sm:w-10">
                {initials}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-950 leading-tight">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">
                  @{user?.username || "user"}
                </p>
              </div>

              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5"
              >
                <div className="border-b border-slate-100 px-4 py-2 sm:hidden">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">@{user?.username}</p>
                </div>

                {user?.username && (
                  <Link
                    to={`/profile/${user.username}`}
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    View profile
                  </Link>
                )}

                <Link
                  to="/messages"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                  className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  <span className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Messages
                  </span>
                  {unreadMessagesCount > 0 && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                      {unreadMessagesCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  <Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Settings
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logoutMutation.mutate();
                  }}
                  disabled={logoutMutation.isPending}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 text-red-500" aria-hidden="true" />
                  {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
