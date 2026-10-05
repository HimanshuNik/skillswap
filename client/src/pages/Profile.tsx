import { useParams } from "react-router-dom";

import AppLayout from "../components/app/AppLayout";
import { mockUsers } from "../data/mockUsers";



const Profile = () => {
  const { username } = useParams();

  const profile = mockUsers.find((profile) => profile.username === username);

  // If user doesn't exist
  if (!profile) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
            <div className="text-4xl">👤</div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Profile not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This SkillSwap profile doesn't exist.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user exists
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm font-semibold text-emerald-600">
          Public Profile
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xl font-bold text-white">
                {profile.initials}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-950">
                  {profile.name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {profile.location}
                </p>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="font-semibold text-slate-700">
                    ★ {profile.rating}
                  </span>

                  <span className="text-slate-500">
                    {profile.completedSessions} sessions completed
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Send swap request
            </button>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="font-bold text-slate-950">About</h2>

            <p className="mt-2 max-w-3xl leading-7 text-slate-600">
              {profile.bio}
            </p>
          </div>

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
            <div>
              <h2 className="font-bold text-slate-950">Can teach</h2>

              <p className="mt-1 text-sm text-slate-500">
                Skills this person can help you learn.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.teaches.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-slate-950">Wants to learn</h2>

              <p className="mt-1 text-sm text-slate-500">
                Skills this person is currently looking for.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.wantsToLearn.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Profile;
