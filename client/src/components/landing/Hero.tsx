import { Link } from "react-router-dom";
import MatchPreview from "./MatchPreview";
import { useAuthStore } from "../../store/useAuthStore";

const Hero = () => {
  const { isAuthenticated, user } = useAuthStore();
  const ctaLink = isAuthenticated ? (user?.isOnboarded ? "/dashboard" : "/onboarding") : "/register";

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Learn without paying for expensive courses
          </div>

          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Your skills are
            <span className="text-emerald-500"> worth sharing.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Teach what you know and learn what you don't.
            SkillSwap connects you with people who have the skills
            you want and want the skills you have — completely free.
          </p>

          <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
            <Link
              to={ctaLink}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Find your SkillSwap →
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-7 py-3.5 text-center font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> No payments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Verified peers
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Reciprocal exchange
            </span>
          </div>
        </div>

        <div className="w-full">
          <MatchPreview />
        </div>
      </div>
    </section>
  );
};

export default Hero;
