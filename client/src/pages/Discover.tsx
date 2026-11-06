import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import AppLayout from "../components/app/AppLayout";
import UserCard from "../components/discover/UserCard";
import { useDiscoverUsers } from "../hooks/useDiscovery";
import { CardSkeleton } from "../components/ui/LoadingSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";

const categories = [
  "All",
  "Development",
  "Design",
  "Creative",
  "Business",
  "Languages",
];

// --------------------
// Discover Page
// --------------------

const Discover = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [page, setPage] = useState(1);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const { data, isLoading, isError, error, refetch } = useDiscoverUsers({
    search: debouncedSearch || undefined,
    category: selectedCategory === "All" ? undefined : selectedCategory,
    page,
    limit: 12,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.total ?? 0;

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
        <div className="relative mt-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people, skills or location..."
            aria-label="Search people, skills or location"
            className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-11 pr-11 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search input"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-r-2xl"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Skill categories">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryChange(category)}
                aria-pressed={isSelected}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
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
          <h2 className="font-semibold text-slate-950">Community Members</h2>

          <p className="text-sm text-slate-500" aria-live="polite">
            {isLoading ? "Searching..." : `${totalCount} ${totalCount === 1 ? "person" : "people"} found`}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-5">
            <CardSkeleton count={6} />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="mt-5">
            <ErrorState
              title="Failed to load discovery results"
              message={(error as Error)?.message || "An unexpected error occurred while searching community members."}
              onRetry={() => refetch()}
            />
          </div>
        )}

        {/* User Cards Grid */}
        {!isLoading && !isError && users.length > 0 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <UserCard
                key={user.id}
                username={user.username}
                name={user.name}
                initials={user.initials}
                location={user.location || "Remote"}
                teaches={user.teaches}
                wantsToLearn={user.wantsToLearn}
                rating={Number((user.averageRating || user.rating || 5.0).toFixed(1))}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && users.length === 0 && (
          <div className="mt-5">
            <EmptyState
              title="No people found"
              description="Try adjusting your search terms or selecting a different category filter."
              actionLabel={search || selectedCategory !== "All" ? "Clear all filters" : undefined}
              onAction={() => {
                setSearch("");
                setSelectedCategory("All");
                setPage(1);
              }}
            />
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !isError && pagination && pagination.totalPages > 1 && (
          <nav
            aria-label="Pagination Navigation"
            className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6"
          >
            <p className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{" "}
              <span className="font-semibold text-slate-900">{pagination.totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Go to previous page"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                aria-label="Go to next page"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
