import { useState } from "react";
import { useSkills } from "../../hooks/useSkills";
import type { SkillLevel, TeachingSkill } from "../../types/onboarding";

type TeachSkillsStepProps = {
  skills: TeachingSkill[];
  onUpdate: (skills: TeachingSkill[]) => void;
  onNext: () => void;
  onBack: () => void;
};

const levels: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const categories = [
  "All",
  "Development",
  "Design",
  "Creative",
  "Business",
  "Languages",
];

const TeachSkillsStep = ({
  skills,
  onUpdate,
  onNext,
  onBack,
}: TeachSkillsStepProps) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: dbSkills = [], isLoading } = useSkills();

  const toggleSkill = (skillName: string) => {
    const alreadySelected = skills.some(
      (skill) => skill.name.toLowerCase() === skillName.toLowerCase()
    );

    if (alreadySelected) {
      onUpdate(
        skills.filter(
          (skill) => skill.name.toLowerCase() !== skillName.toLowerCase()
        )
      );
      return;
    }

    onUpdate([
      ...skills,
      {
        name: skillName,
        level: "Intermediate",
      },
    ]);
  };

  const changeLevel = (
    skillName: string,
    newLevel: SkillLevel
  ) => {
    onUpdate(
      skills.map((skill) =>
        skill.name.toLowerCase() === skillName.toLowerCase()
          ? {
              ...skill,
              level: newLevel,
            }
          : skill
      )
    );
  };

  const filteredSkills = dbSkills.filter((skill) => {
    const matchesSearch = skill.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
          Your knowledge
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          What can you teach?
        </h1>

        <p className="mt-4 text-slate-600">
          Select your skills and tell us your experience level.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search skills (e.g. React, Python, UI/UX, English)..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />

        {/* Categories */}
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm font-semibold text-slate-700">
          Select skills from database catalog
        </p>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Loading skills catalog...
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {filteredSkills.map((skill) => {
              const selected = skills.some(
                (s) => s.name.toLowerCase() === skill.name.toLowerCase()
              );

              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.name)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
                      : "border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50"
                  }`}
                >
                  {selected ? "✓" : "+"} {skill.name}
                </button>
              );
            })}
            {filteredSkills.length === 0 && (
              <p className="text-sm text-slate-500 italic">No skills matched your search.</p>
            )}
          </div>
        )}

        {skills.length > 0 && (
          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold text-slate-900">
                Your teaching skills
              </p>

              <span className="text-sm text-slate-500">
                {skills.length} selected
              </span>
            </div>

            <div className="space-y-4">
              {skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill.name)}
                      className="text-sm text-slate-400 hover:text-rose-500"
                      title="Remove skill"
                    >
                      ✕
                    </button>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {skill.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Your experience level
                      </p>
                    </div>
                  </div>

                  <select
                    value={skill.level}
                    onChange={(event) =>
                      changeLevel(
                        skill.name,
                        event.target.value as SkillLevel
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                  >
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={skills.length === 0}
          className="rounded-xl bg-slate-950 px-7 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Continue →
        </button>
      </div>
    </div>
  );
};

export default TeachSkillsStep;
