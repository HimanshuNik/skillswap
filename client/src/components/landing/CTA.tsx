import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const CTA = () => {
  const { isAuthenticated, user } = useAuthStore();
  const ctaLink = isAuthenticated ? (user?.isOnboarded ? "/dashboard" : "/onboarding") : "/register";

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-500 px-6 py-16 text-center shadow-xl sm:px-12 lg:py-20">
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="font-semibold text-emerald-950">
              Your next skill could be one connection away.
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Stop buying courses.
              <br />
              Start swapping skills.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base text-emerald-950/80 sm:text-lg">
              Create your profile, share what you know and find
              someone who can teach you what you want to learn.
            </p>

            <Link
              to={ctaLink}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-white"
            >
              Create your free profile →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
