type Skill = {
  name: string;
  category: string;
  learners: number;
  icon: string;
};

const skills: Skill[] = [
  {
    name: "Web Development",
    category: "Technology",
    learners: 1240,
    icon: "💻",
  },
  {
    name: "UI/UX Design",
    category: "Design",
    learners: 860,
    icon: "🎨",
  },
  {
    name: "Video Editing",
    category: "Creative",
    learners: 720,
    icon: "🎬",
  },
  {
    name: "Python",
    category: "Programming",
    learners: 1100,
    icon: "🐍",
  },
  {
    name: "Photography",
    category: "Creative",
    learners: 540,
    icon: "📷",
  },
  {
    name: "Public Speaking",
    category: "Communication",
    learners: 630,
    icon: "🎤",
  },
];

const PopularSkills = () => {
  return (
    <section id="discover" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
              Discover
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Skills people are swapping
            </h2>

            <p className="mt-4 max-w-xl text-slate-600">
              Explore what the community is teaching and learning
              right now.
            </p>
          </div>

          <button className="self-start rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:self-auto">
            Explore all skills →
          </button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="group cursor-pointer rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100"
            >
              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  {skill.icon}
                </div>

                <div>
                  <h3 className="font-bold text-slate-950 transition group-hover:text-emerald-600">
                    {skill.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {skill.category}
                  </p>
                </div>

              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">
                  {skill.learners.toLocaleString()} learners
                </span>

                <span className="font-semibold text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900">
                  →
                </span>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default PopularSkills;