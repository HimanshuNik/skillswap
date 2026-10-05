import { useState } from "react";

import AppLayout from "../components/app/AppLayout";
import UserCard from "../components/discover/UserCard";
import { mockUsers } from "../data/mockUsers";



const categories = ["All", "Development", "Design", "Creative", "Business"];

// --------------------
// Discover Page
// --------------------

const Discover = () => {
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");

  // --------------------
  // Search Logic
  // --------------------

  const filteredUsers = mockUsers.filter((user) => {
    const searchTerm = search.toLowerCase().trim();

    // Check user's name
    const matchesName = user.name.toLowerCase().includes(searchTerm);

    // Check user's location
    const matchesLocation = user.location.toLowerCase().includes(searchTerm);

    // Check skills the user teaches
    const matchesTeachingSkill = user.teaches.some((skill) =>
      skill.toLowerCase().includes(searchTerm),
    );

    // Check skills the user wants to learn
    const matchesLearningSkill = user.wantsToLearn.some((skill) =>
      skill.toLowerCase().includes(searchTerm),
    );

    // Search is successful if ANY of the above matches
    const matchesSearch =
      matchesName ||
      matchesLocation ||
      matchesTeachingSkill ||
      matchesLearningSkill;

    // Category must either be "All"
    // OR match the user's category
    const matchesCategory =
      selectedCategory === "All" || user.category === selectedCategory;

    // User must satisfy BOTH conditions
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}

        <div>
          <p className="text-sm font-semibold text-emerald-600">Discover</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Find people to learn from
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Explore the SkillSwap community and find people who can teach the
            skills you're looking for.
          </p>
        </div>

        {/* Search */}

        <div className="mt-8">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people, skills or location..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        {/* Category Filters */}

        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Results Header */}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-semibold text-slate-950">Community</h2>

          <p className="text-sm text-slate-500">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "person" : "people"} found
          </p>
        </div>

        {/* User Cards */}

        {filteredUsers.length > 0 ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                username={user.username}
                name={user.name}
                initials={user.initials}
                location={user.location}
                teaches={user.teaches}
                wantsToLearn={user.wantsToLearn}
                rating={user.rating}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="text-4xl">🔍</div>

            <h3 className="mt-4 font-bold text-slate-950">No people found</h3>

            <p className="mt-2 text-sm text-slate-500">
              Try searching for another person, skill, or location.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
