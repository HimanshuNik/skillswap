const MatchPreview = () => {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">

        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">
            SKILL MATCH
          </span>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-600">
            94% Match
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-bold text-white">
              R
            </div>

            <h3 className="font-bold text-slate-900">Rahul</h3>

            <p className="mt-1 text-xs text-slate-500">
              Teaches
            </p>

            <span className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              Python
            </span>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
            ↔
          </div>

          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-white">
              A
            </div>

            <h3 className="font-bold text-slate-900">Aman</h3>

            <p className="mt-1 text-xs text-slate-500">
              Teaches
            </p>

            <span className="mt-2 inline-block rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
              Video Editing
            </span>
          </div>

        </div>

        <div className="my-6 border-t border-slate-100" />

        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Perfect skills exchange
        </div>

      </div>

      <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-xs text-slate-500">Community rating</p>
        <p className="font-bold text-slate-900">★ 4.9</p>
      </div>
    </div>
  );
};

export default MatchPreview;