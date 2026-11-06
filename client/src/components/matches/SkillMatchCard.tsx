import { Link } from "react-router-dom";

export type SkillMatchCardProps = {
  username: string;
  name: string;
  initials: string;
  location: string;
  teaches: string | string[];
  wantsToLearn: string | string[];
  matchPercentage: number;
  skillCompatibility: number;
  availabilityMatch: number;
  rating: number;
  isReciprocal?: boolean;
  explanation?: string;
  matchingDays?: string[];
};

const SkillMatchCard = ({
  username,
  name,
  initials,
  location,
  teaches,
  wantsToLearn,
  matchPercentage,
  skillCompatibility,
  availabilityMatch,
  rating,
  isReciprocal,
  explanation,
  matchingDays,
}: SkillMatchCardProps) => {
  const formattedTeaches = Array.isArray(teaches) ? teaches.join(", ") : teaches;
  const formattedWantsToLearn = Array.isArray(wantsToLearn)
    ? wantsToLearn.join(", ")
    : wantsToLearn;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white shadow-xs">
              {initials}
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-bold text-slate-950">{name}</h3>
              <p className="truncate text-sm text-slate-500">{location}</p>
              <p className="mt-0.5 text-sm font-medium text-amber-600">★ {rating.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700"
              role="status"
              aria-label={`${matchPercentage} percent match`}
            >
              {matchPercentage}% Match
            </span>
            {isReciprocal && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                Reciprocal
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100/50">
            <p className="text-xs font-semibold text-emerald-800">
              They can teach you
            </p>
            <p className="mt-1 font-semibold text-slate-950 text-sm">
              {formattedTeaches || "Various skills"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600">
              They want to learn
            </p>
            <p className="mt-1 font-semibold text-slate-950 text-sm">
              {formattedWantsToLearn || "Various skills"}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Compatibility Breakdown
          </p>

          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Skill Reciprocity</span>
                <span className="font-semibold text-slate-800">{skillCompatibility}%</span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
                role="progressbar"
                aria-valuenow={skillCompatibility}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Skill Reciprocity: ${skillCompatibility}%`}
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, skillCompatibility))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Schedule Overlap</span>
                <span className="font-semibold text-slate-800">{availabilityMatch}%</span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
                role="progressbar"
                aria-valuenow={availabilityMatch}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Schedule Overlap: ${availabilityMatch}%`}
              >
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, availabilityMatch))}%` }}
                />
              </div>
            </div>

            {matchingDays && matchingDays.length > 0 && (
              <p className="text-xs text-slate-500">
                Shared availability: <span className="font-medium text-slate-700">{matchingDays.join(", ")}</span>
              </p>
            )}

            {explanation && (
              <p className="text-xs italic text-slate-500 pt-1">{explanation}</p>
            )}
          </div>
        </div>
      </div>

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
          Propose Swap
        </Link>
      </div>
    </div>
  );
};

export default SkillMatchCard;
