type SessionStatus = "upcoming" | "completed" | "cancelled";

type SessionCardProps = {
  name: string;
  skill: string;
  date: string;
  time: string;
  duration: number;
  status: SessionStatus;
};

const SessionCard = ({
  name,
  skill,
  date,
  time,
  duration,
  status,
}: SessionCardProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case "upcoming":
        return "bg-blue-50 text-blue-700";

      case "completed":
        return "bg-emerald-50 text-emerald-700";

      case "cancelled":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getButtonText = () => {
    switch (status) {
      case "upcoming":
        return "View session";

      case "completed":
        return "Leave review";

      case "cancelled":
        return "View details";

      default:
        return "View session";
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">
          ◷
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-950">{skill}</p>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyles()}`}
            >
              {status}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">Session with {name}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <div>
          <p className="text-sm font-semibold text-slate-700">{date}</p>

          <p className="mt-1 text-xs text-slate-500">
            {time} · {duration} min
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default SessionCard;
