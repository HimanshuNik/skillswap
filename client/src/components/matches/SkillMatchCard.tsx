import { useState } from "react";

import { Link } from "react-router-dom";

type RequestStatus = "idle" | "pending" | "accepted" | "rejected";

type SkillMatchCardProps = {
  username: string;
  name: string;
  initials: string;
  location: string;
  teaches: string;
  wantsToLearn: string;
  matchPercentage: number;
  skillCompatibility: number;
  availabilityMatch: number;
  rating: number;
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
}: SkillMatchCardProps) => {
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");

  const getRequestButtonText = () => {
    switch (requestStatus) {
      case "pending":
        return "Request pending";

      case "accepted":
        return "Match accepted ✓";

      case "rejected":
        return "Request declined";

      default:
        return "Send request";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
            {initials}
          </div>

          <div>
            <h3 className="font-bold text-slate-950">{name}</h3>

            <p className="mt-1 text-sm text-slate-500">{location}</p>

            <p className="mt-1 text-sm text-slate-500">★ {rating}</p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
          {matchPercentage}% Match
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700">
            They can teach you
          </p>

          <p className="mt-1 font-bold text-slate-950">{teaches}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            They want to learn
          </p>

          <p className="mt-1 font-bold text-slate-950">{wantsToLearn}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Why this match?
        </p>

        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>✓ {skillCompatibility}% skill compatibility</p>

          <p>✓ {availabilityMatch}% availability overlap</p>

          <p>✓ {rating} community rating</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          to={`/profile/${username}`}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View profile
        </Link>

        <button
          type="button"
          onClick={() => setRequestStatus("pending")}
          disabled={requestStatus !== "idle"}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            requestStatus === "pending"
              ? "cursor-not-allowed bg-amber-50 text-amber-700"
              : requestStatus === "accepted"
                ? "cursor-not-allowed bg-emerald-50 text-emerald-700"
                : requestStatus === "rejected"
                  ? "cursor-not-allowed bg-red-50 text-red-700"
                  : "bg-slate-950 text-white hover:bg-slate-800"
          }`}
        >
          {getRequestButtonText()}
        </button>
      </div>
    </div>
  );
};

export default SkillMatchCard;
