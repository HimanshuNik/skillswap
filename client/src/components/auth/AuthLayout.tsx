 import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  description: string;
};

const AuthLayout = ({
  children,
  title,
  description,
}: AuthLayoutProps) => {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left side */}
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            <Link
              to="/"
              className="inline-block text-2xl font-bold tracking-tight text-slate-950"
            >
              Skill<span className="text-emerald-500">Swap</span>
            </Link>

            <div className="mt-12">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {title}
              </h1>

              <p className="mt-3 text-slate-600">
                {description}
              </p>
            </div>

            <div className="mt-8">
              {children}
            </div>

          </div>
        </section>

        {/* Right side */}
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:items-center lg:justify-center">

          <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 max-w-lg px-12">

            <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-emerald-400">
              Knowledge over money
            </span>

            <h2 className="mt-8 text-5xl font-bold leading-tight text-white">
              What you know could be exactly what someone needs.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-400">
              Join people exchanging skills, experience and time
              instead of paying for another course.
            </p>

            <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">
                    Rahul
                  </p>
                  <p className="text-sm text-slate-400">
                    Teaches Python
                  </p>
                </div>

                <div className="rounded-full bg-emerald-500 px-4 py-2 font-bold text-slate-950">
                  ↔
                </div>

                <div className="text-right">
                  <p className="font-semibold text-white">
                    Aman
                  </p>
                  <p className="text-sm text-slate-400">
                    Teaches Editing
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-5 text-center">
                <span className="text-sm font-semibold text-emerald-400">
                  94% Skill Match
                </span>
              </div>

            </div>

          </div>
        </section>

      </div>
    </main>
  );
};

export default AuthLayout;