import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type OnboardingLayoutProps = {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
};

const OnboardingLayout = ({
  children,
  currentStep,
  totalSteps,
}: OnboardingLayoutProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-slate-950"
          >
            Skill<span className="text-emerald-500">Swap</span>
          </Link>

          <span className="text-sm font-medium text-slate-500">
            Step {currentStep} of {totalSteps}
          </span>

        </div>
      </header>

      {/* Progress */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-6 py-14">
        {children}
      </section>

    </main>
  );
};

export default OnboardingLayout;