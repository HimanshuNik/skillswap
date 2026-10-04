import MatchPreview from "./MatchPreview";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2">

        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span>●</span>
            Learn without paying for courses
          </div>

          <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Your skills are
            <span className="text-emerald-500"> worth sharing.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Teach what you know and learn what you don't.
            SkillSwap connects you with people who have the skills
            you want and want the skills you have.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-full bg-slate-950 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-800">
              Find your SkillSwap →
            </button>

            <button className="rounded-full border border-slate-300 px-7 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50">
              See how it works
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span>✓ No payments</span>
            <span>✓ Real people</span>
            <span>✓ Learn together</span>
          </div>
        </div>

        <div>
          <MatchPreview />
        </div>

      </div>
    </section>
  );
};

export default Hero;