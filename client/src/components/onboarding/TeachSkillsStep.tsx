import { useState } from "react";

import type {
  SkillLevel,
  TeachingSkill,
} from "../../types/onboarding";

type TeachSkillsStepProps = {
  skills: TeachingSkill[];
  onUpdate: (skills: TeachingSkill[]) => void;
  onNext: () => void;
  onBack: () => void;
};

const availableSkills = [
  "JavaScript",
  "React",
  "Python",
  "UI/UX Design",
  "Video Editing",
  "Photography",
  "Graphic Design",
  "Public Speaking",
  "Digital Marketing",
  "Excel",
  "Guitar",
  "English",
];

const levels: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const TeachSkillsStep = ({
  skills,
  onUpdate,
  onNext,
  onBack,
}: TeachSkillsStepProps) => {
  const [search, setSearch] = useState("");

  const toggleSkill = (skillName: string) => {
    const alreadySelected = skills.some(
      (skill) => skill.name === skillName
    );

    if (alreadySelected) {
      onUpdate(
        skills.filter(
          (skill) => skill.name !== skillName
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
        skill.name === skillName
          ? {
              ...skill,
              level: newLevel,
            }
          : skill
      )
    );
  };

  const filteredSkills = availableSkills.filter(
    (skill) =>
      skill
        .toLowerCase()
        .includes(search.toLowerCase())
  );

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
          Select your skills and tell us your experience
          level.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search skills..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />

        <p className="mt-8 text-sm font-semibold text-slate-700">
          Select skills
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {filteredSkills.map((skillName) => {
            const selected = skills.some(
              (skill) => skill.name === skillName
            );

            return (
              <button
                key={skillName}
                type="button"
                onClick={() =>
                  toggleSkill(skillName)
                }
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50"
                }`}
              >
                {selected ? "✓" : "+"} {skillName}
              </button>
            );
          })}
        </div>

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
                  <div>
                    <p className="font-semibold text-slate-900">
                      {skill.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Your experience level
                    </p>
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
                      <option
                        key={level}
                        value={level}
                      >
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