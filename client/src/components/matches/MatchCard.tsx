import { Link } from "react-router-dom";

type MatchCardProps = {
  username?: string;
  name: string;
  initials: string;
  teaches: string;
  wantsToLearn: string;
  matchPercentage: number;
  rating: number;
};

const MatchCard = ({
  username,
  name,
  initials,
  teaches,
  wantsToLearn,
  matchPercentage,
  rating,
}: MatchCardProps) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white shadow-xs">
              {initials}
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-bold text-slate-950">{name}</h3>
              <p className="mt-0.5 text-sm font-medium text-amber-600">★ {rating.toFixed(1)}</p>
            </div>
          </div>

          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
            {matchPercentage}% Match
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50/50 p-3 border border-emerald-100/40">
            <p className="text-xs font-semibold text-emerald-800">Can teach you</p>
            <p className="mt-1 font-semibold text-slate-900 text-sm truncate">{teaches}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600">Wants to learn</p>
            <p className="mt-1 font-semibold text-slate-900 text-sm truncate">{wantsToLearn}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-3 pt-2">
        {username ? (
          <>
            <Link
              to={`/profile/${username}`}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              View profile
            </Link>
            <Link
              to={`/profile/${username}`}
              className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Connect
            </Link>
          </>
        ) : (
          <Link
            to="/discover"
            className="flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Find Member
          </Link>
        )}
      </div>
    </div>
  );
};

export default MatchCard;
