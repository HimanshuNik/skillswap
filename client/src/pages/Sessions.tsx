import { useState } from "react";

import AppLayout from "../components/app/AppLayout";
import SessionCard from "../components/sessions/SessionCard";

type SessionStatus = "upcoming" | "completed" | "cancelled";

type SessionFilter = "all" | "upcoming" | "completed";

type SkillSession = {
  id: number;
  name: string;
  skill: string;
  date: string;
  time: string;
  duration: number;
  status: SessionStatus;
};

const sessions: SkillSession[] = [
  {
    id: 1,
    name: "Aman Sharma",
    skill: "Video Editing",
    date: "5 Oct",
    time: "6:00 PM",
    duration: 60,
    status: "upcoming",
  },
  {
    id: 2,
    name: "Priya Verma",
    skill: "UI/UX Design",
    date: "8 Oct",
    time: "7:30 PM",
    duration: 60,
    status: "upcoming",
  },
  {
    id: 3,
    name: "Rohan Mehta",
    skill: "Photography Basics",
    date: "28 Sep",
    time: "5:00 PM",
    duration: 90,
    status: "completed",
  },
];

const filters: {
  label: string;
  value: SessionFilter;
}[] = [
  {
    label: "Upcoming",
    value: "upcoming",
  },
  {
    label: "Completed",
    value: "completed",
  },
  {
    label: "All",
    value: "all",
  },
];

const Sessions = () => {
  const [activeFilter, setActiveFilter] = useState<SessionFilter>("upcoming");

  const filteredSessions = sessions.filter((session) => {
    if (activeFilter === "all") {
      return true;
    }

    return session.status === activeFilter;
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Sessions</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Your learning sessions
          </h1>

          <div className="mt-8 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-950 text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {filteredSessions.length > 0 ? (
            <div className="mt-8 space-y-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  name={session.name}
                  skill={session.skill}
                  date={session.date}
                  time={session.time}
                  duration={session.duration}
                  status={session.status}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <div className="text-4xl">📅</div>

              <h3 className="mt-4 font-bold text-slate-950">
                No sessions found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                You don't have any sessions in this category yet.
              </p>
            </div>
          )}

          <p className="mt-2 max-w-2xl text-slate-500">
            Manage your upcoming and completed SkillSwap sessions.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Sessions;
