import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          Skill<span className="text-emerald-500">Swap</span>
        </Link>

        {/* Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#discover"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Discover
          </a>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            How it works
          </a>

          <a
            href="#community"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            Community
          </a>
        </div>

        {/* Authentication */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950 sm:block"
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Join SkillSwap
          </Link>
        </div>

      </nav>
    </header>
  );
};

export default Navbar;