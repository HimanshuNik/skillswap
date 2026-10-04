const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">

        <div className="flex flex-col justify-between gap-10 md:flex-row">

          <div>
            <a
              href="/"
              className="text-2xl font-bold tracking-tight text-slate-950"
            >
              Skill<span className="text-emerald-500">Swap</span>
            </a>

            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              Exchange knowledge, not money. Learn from people and
              teach what you already know.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">

            <div>
              <p className="font-semibold text-slate-950">Platform</p>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <a href="#discover" className="hover:text-slate-950">
                  Discover
                </a>

                <a href="#how-it-works" className="hover:text-slate-950">
                  How it works
                </a>

                <a href="#community" className="hover:text-slate-950">
                  Community
                </a>
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-950">Account</p>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <a href="/login" className="hover:text-slate-950">
                  Sign in
                </a>

                <a href="/register" className="hover:text-slate-950">
                  Create account
                </a>
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-950">Legal</p>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <a href="#" className="hover:text-slate-950">
                  Privacy
                </a>

                <a href="#" className="hover:text-slate-950">
                  Terms
                </a>
              </div>
            </div>

          </div>

        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © 2026 SkillSwap. Built for people who never stop learning.
        </div>

      </div>
    </footer>
  );
};

export default Footer;