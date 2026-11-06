import { Link } from "react-router-dom";

type Skill = {
  name: string;
  category: string;
  learners: number;
  icon: string;
};

const skills: Skill[] = [
  {
    name: "Web Development",
    category: "Development",
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
    category: "Development",
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
    <section id="discover" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 sm:text-sm">
              Discover
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Skills people are swapping
            </h2>

            <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
              Explore what the community is teaching and learning right now.
            </p>
          </div>

          <Link
            to="/discover"
            className="self-start rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 md:self-auto"
          >
            Explore all skills →
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Link
              key={skill.name}
              to={`/discover?category=${encodeURIComponent(skill.category)}`}
              className="group rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl" aria-hidden="true">
                  {skill.icon}
                </div>

                <div>
                  <h3 className="font-bold text-slate-950 transition group-hover:text-emerald-600">
                    {skill.name}
                  </h3>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {skill.category}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">
                  {skill.learners.toLocaleString()} learners
                </span>

                <span className="text-sm font-semibold text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularSkills;
