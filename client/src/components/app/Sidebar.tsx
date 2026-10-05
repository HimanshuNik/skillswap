import { NavLink } from "react-router-dom";

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
    name: "Messages",
    path: "/messages",
    icon: "✉",
  },
  {
    name: "Sessions",
    path: "/sessions",
    icon: "◷",
  },
];

const Sidebar = () => {
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

              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <span>⚙</span>
            Settings
          </NavLink>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;