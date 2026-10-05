import AppLayout from "../components/app/AppLayout";

const Settings = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Settings</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Account settings
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your SkillSwap profile, preferences, and account.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Profile Settings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Profile information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the information shown on your SkillSwap profile.
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="text-sm font-semibold text-slate-700"
                >
                  Display name
                </label>

                <input
                  id="name"
                  type="text"
                  defaultValue="John Wick"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="text-sm font-semibold text-slate-700"
                >
                  Location
                </label>

                <input
                  id="location"
                  type="text"
                  placeholder="Your city"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="bio"
                className="text-sm font-semibold text-slate-700"
              >
                Bio
              </label>

              <textarea
                id="bio"
                rows={4}
                placeholder="Tell the community a little about yourself..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Save changes
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Skills</h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage the skills you teach and the skills you want to learn.
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Skills I can teach
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    React
                  </span>

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    JavaScript
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-4 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  + Add teaching skill
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Skills I want to learn
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    Video Editing
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    UI/UX Design
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-4 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  + Add learning skill
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Availability</h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose when you're usually available for SkillSwap sessions.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => (
                <div
                  key={day}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-semibold text-slate-800">{day}</p>

                  <div className="flex flex-wrap gap-2">
                    {["Morning", "Afternoon", "Evening"].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sessionLength"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Preferred session length
                  </label>

                  <select
                    id="sessionLength"
                    defaultValue="60"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="timezone"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Timezone
                  </label>

                  <select
                    id="timezone"
                    defaultValue="Asia/Kolkata"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="Asia/Kolkata">
                      India Standard Time (IST)
                    </option>

                    <option value="UTC">
                      Coordinated Universal Time (UTC)
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Save availability
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Account</h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your account security and account status.
              </p>
            </div>

            <div className="mt-6 divide-y divide-slate-200">
              <div className="flex flex-col gap-4 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    Change password
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Update your account password.
                  </p>
                </div>

                <button
                  type="button"
                  className="self-start rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:self-auto"
                >
                  Change password
                </button>
              </div>

              <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-red-600">Delete account</p>

                  <p className="mt-1 text-sm text-slate-500">
                    Permanently delete your SkillSwap account and data.
                  </p>
                </div>

                <button
                  type="button"
                  className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
