type MatchCardProps = {
  name: string;
  initials: string;
  teaches: string;
  wantsToLearn: string;
  matchPercentage: number;
  rating: number;
};

const MatchCard = ({
  name,
  initials,
  teaches,
  wantsToLearn,
  matchPercentage,
  rating,
}: MatchCardProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
            {initials}
          </div>

          <div>
            <h3 className="font-bold text-slate-950">
              {name}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              ★ {rating}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
          {matchPercentage}% Match
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            Can teach you
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {teaches}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            Wants to learn
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {wantsToLearn}
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View profile
        </button>

        <button
          type="button"
          className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Connect
        </button>
      </div>
    </div>
  );
};

export default MatchCard;