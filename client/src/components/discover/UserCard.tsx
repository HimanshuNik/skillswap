import { Link } from "react-router-dom";

type UserCardProps = {
  username: string;
  name: string;
  initials: string;
  location: string;
  teaches: string[];
  wantsToLearn: string[];
  rating: number;
};

const UserCard = ({
  username,
  name,
  initials,
  location,
  teaches,
  wantsToLearn,
  rating,
}: UserCardProps) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div>
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white shadow-xs">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-slate-950">{name}</h3>
            <p className="truncate text-sm text-slate-500">{location}</p>
            <p className="mt-0.5 text-sm font-medium text-amber-600">★ {rating.toFixed(1)}</p>
          </div>
        </div>

        {/* Teaching Skills */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Can teach
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {teaches && teaches.length > 0 ? (
              teaches.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs italic text-slate-400">No skills listed</span>
            )}
          </div>
        </div>

        {/* Learning Skills */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Wants to learn
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {wantsToLearn && wantsToLearn.length > 0 ? (
              wantsToLearn.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs italic text-slate-400">No skills listed</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3 pt-2">
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
      </div>
    </div>
  );
};

export default UserCard;
