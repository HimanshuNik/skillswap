import AppLayout from "../components/app/AppLayout";
import SkillMatchCard from "../components/matches/SkillMatchCard";
import { mockUsers } from "../data/mockUsers";

type SkillMatch = {
  id: number;
  userId: number;
  skillCompatibility: number;
  availabilityMatch: number;
};

const matches: SkillMatch[] = [
  {
    id: 1,
    userId: 1,
    skillCompatibility: 100,
    availabilityMatch: 80,
  },
  {
    id: 2,
    userId: 2,
    skillCompatibility: 90,
    availabilityMatch: 85,
  },
  {
    id: 3,
    userId: 3,
    skillCompatibility: 85,
    availabilityMatch: 80,
  },
];

const calculateMatchScore = (
  skillCompatibility: number,
  availabilityMatch: number,
  rating: number,
) => {
  const skillScore = skillCompatibility * 0.6;

  const availabilityScore = availabilityMatch * 0.25;

  const ratingPercentage = (rating / 5) * 100;

  const ratingScore = ratingPercentage * 0.15;

  const totalScore = skillScore + availabilityScore + ratingScore;

  return Math.round(totalScore);
};

const Matches = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Matches</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Your skill matches
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Discover people whose learning goals complement the skills you can
            teach.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {matches.map((match) => {
            const user = mockUsers.find((user) => user.id === match.userId);

            if (!user) {
              return null;
            }

            return (
              <SkillMatchCard
                key={match.id}
                username={user.username}
                name={user.name}
                initials={user.initials}
                location={user.location}
                teaches={user.teaches[0]}
                wantsToLearn={user.wantsToLearn[0]}
                matchPercentage={calculateMatchScore(
                  match.skillCompatibility,
                  match.availabilityMatch,
                  user.rating,
                )}
                skillCompatibility={match.skillCompatibility}
                availabilityMatch={match.availabilityMatch}
                rating={user.rating}
              />
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Matches;
