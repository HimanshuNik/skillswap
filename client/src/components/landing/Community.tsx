const Community = () => {
  const stats = [
    { value: "5,000+", label: "Learners" },
    { value: "120+", label: "Skills" },
    { value: "8,400+", label: "Swaps completed" },
    { value: "4.9/5", label: "Average rating" },
  ];

  return (
    <section id="community" className="bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">

        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">
              Community
            </p>

            <h2 className="mt-4 max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">
              Everyone knows something worth teaching.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
              SkillSwap brings learners and creators together.
              Share your experience, discover people with complementary
              skills and grow together.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {["R", "A", "S", "P"].map((letter) => (
                  <div
                    key={letter}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-700 text-sm font-bold"
                  >
                    {letter}
                  </div>
                ))}
              </div>

              <div>
                <p className="font-semibold">Join the community</p>
                <p className="text-sm text-slate-400">
                  Learn something new today
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
              >
                <p className="text-3xl font-bold text-emerald-400 sm:text-4xl">
                  {stat.value}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Community;