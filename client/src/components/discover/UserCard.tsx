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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      {/* User */}

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
          {initials}
        </div>

        <div>
          <h3 className="font-bold text-slate-950">{name}</h3>

          <p className="mt-1 text-sm text-slate-500">{location}</p>

          <p className="mt-1 text-sm text-slate-500">★ {rating}</p>
        </div>
      </div>

      {/* Teaching Skills */}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Can teach
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {teaches.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Learning Skills */}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Wants to learn
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {wantsToLearn.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}

      <div className="mt-6 flex gap-3">
        <Link
          to={`/profile/${username}`}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View profile
        </Link>

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

export default UserCard;
