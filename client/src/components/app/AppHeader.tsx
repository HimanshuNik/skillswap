const AppHeader = () => {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-[73px] items-center justify-between px-6 lg:px-8">

        <div>
          <p className="text-sm text-slate-500">
            SkillSwap Community
          </p>
        </div>

        <div className="flex items-center gap-4">

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Notifications"
          >
            🔔

            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
          </button>

          <div className="hidden h-8 border-l border-slate-200 sm:block" />

          <button
            type="button"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
              H
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-950">
                John Wick
              </p>

              <p className="text-xs text-slate-500">
                View profile
              </p>
            </div>

            <span className="hidden text-slate-400 sm:block">
              ▾
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};

export default AppHeader;