import type { ProfileData } from "../../types/onboarding";

type ProfileStepProps = {
  data: ProfileData;
  onUpdate: (data: ProfileData) => void;
  onNext: () => void;
};

const ProfileStep = ({
  data,
  onUpdate,
  onNext,
}: ProfileStepProps) => {
  const handleChange = (
    field: keyof ProfileData,
    value: string
  ) => {
    onUpdate({
      ...data,
      [field]: value,
    });
  };

  const canContinue = data.displayName.trim().length > 0;

  return (
    <div>
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
          About you
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Let's build your profile.
        </h1>

        <p className="mt-4 text-slate-600">
          Tell the SkillSwap community a little about yourself.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

        <div className="mb-8 flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-400">
            {data.displayName
              ? data.displayName.charAt(0).toUpperCase()
              : "?"}
          </div>

          <div>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Upload photo
            </button>

            <p className="mt-2 text-xs text-slate-500">
              JPG or PNG. Max 5MB.
            </p>
          </div>
        </div>

        <div className="space-y-6">

          <div>
            <label
              htmlFor="displayName"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Display name
            </label>

            <input
              id="displayName"
              type="text"
              value={data.displayName}
              onChange={(event) =>
                handleChange(
                  "displayName",
                  event.target.value
                )
              }
              placeholder="How should people call you?"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Bio
            </label>

            <textarea
              id="bio"
              rows={4}
              value={data.bio}
              onChange={(event) =>
                handleChange("bio", event.target.value)
              }
              placeholder="Tell people what you're interested in..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Location
            </label>

            <input
              id="location"
              type="text"
              value={data.location}
              onChange={(event) =>
                handleChange(
                  "location",
                  event.target.value
                )
              }
              placeholder="e.g. Nagpur, India"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />

            <p className="mt-2 text-xs text-slate-500">
              Only your city will be shown publicly.
            </p>
          </div>

        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="rounded-xl bg-slate-950 px-7 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Continue →
        </button>
      </div>
    </div>
  );
};

export default ProfileStep;