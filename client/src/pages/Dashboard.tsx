import AppLayout from "../components/app/AppLayout";
import MatchCard from "../components/matches/MatchCard";
import SessionCard from "../components/sessions/SessionCard";

// --------------------
// Types
// --------------------

type DashboardStat = {
  label: string;
  value: string;
  description: string;
};

type RecommendedMatch = {
  id: number;
  name: string;
  initials: string;
  teaches: string;
  wantsToLearn: string;
  matchPercentage: number;
  rating: number;
};

type UpcomingSession = {
  id: number;
  name: string;
  skill: string;
  date: string;
  time: string;
  duration: number;
};

// --------------------
// Temporary Data
// --------------------

const stats: DashboardStat[] = [
  {
    label: "Skill matches",
    value: "12",
    description: "3 new matches",
  },
  {
    label: "Upcoming sessions",
    value: "3",
    description: "Next session tomorrow",
  },
  {
    label: "Skills shared",
    value: "8",
    description: "Across 14 sessions",
  },
  {
    label: "Community rating",
    value: "4.9",
    description: "★ 18 reviews",
  },
];

const recommendedMatches: RecommendedMatch[] = [
  {
    id: 1,
    name: "Aman Sharma",
    initials: "AS",
    teaches: "Video Editing",
    wantsToLearn: "React",
    matchPercentage: 94,
    rating: 4.9,
  },
  {
    id: 2,
    name: "Priya Verma",
    initials: "PV",
    teaches: "UI/UX Design",
    wantsToLearn: "JavaScript",
    matchPercentage: 89,
    rating: 4.8,
  },
  {
    id: 3,
    name: "Rohan Mehta",
    initials: "RM",
    teaches: "Photography",
    wantsToLearn: "React",
    matchPercentage: 86,
    rating: 4.7,
  },
];

const upcomingSessions: UpcomingSession[] = [
  {
    id: 1,
    name: "Aman Sharma",
    skill: "Video Editing",
    date: "Tomorrow",
    time: "6:00 PM",
    duration: 60,
  },
  {
    id: 2,
    name: "Priya Verma",
    skill: "React Basics",
    date: "8 Oct",
    time: "7:30 PM",
    duration: 60,
  },
];

// --------------------
// Dashboard
// --------------------

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">

        {/* Welcome Section */}

        <div>
          <p className="text-sm font-semibold text-emerald-600">
            Dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Welcome back, John Wick 👋
          </h1>

          <p className="mt-2 text-slate-500">
            Here's what's happening with your SkillSwap journey.
          </p>
        </div>

        {/* Stats Section */}

        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {stat.value}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Matches Section */}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Recommended matches
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                People whose skills match what you want to learn.
              </p>
            </div>

            <button
              type="button"
              className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              View all →
            </button>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-3">
            {recommendedMatches.map((match) => (
              <MatchCard
                key={match.id}
                name={match.name}
                initials={match.initials}
                teaches={match.teaches}
                wantsToLearn={match.wantsToLearn}
                matchPercentage={match.matchPercentage}
                rating={match.rating}
              />
            ))}
          </div>
        </section>

        {/* Upcoming Sessions Section */}

        <section className="mt-10">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Upcoming sessions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your scheduled SkillSwap learning sessions.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {upcomingSessions.map((session) => (
              <SessionCard
                key={session.id}
                name={session.name}
                skill={session.skill}
                date={session.date}
                time={session.time}
                duration={session.duration}
                status="upcoming"
              />
            ))}
          </div>
        </section>

      </div>
    </AppLayout>
  );
};

export default Dashboard;