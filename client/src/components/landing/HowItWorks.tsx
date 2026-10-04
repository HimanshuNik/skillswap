type StepProps = {
  number: string;
  title: string;
  description: string;
};

const Step = ({ number, title, description }: StepProps) => {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50">
      <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
        {number}
      </div>

      <h3 className="text-xl font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      title: "Share your skills",
      description:
        "Tell the community what you can teach and what you'd love to learn.",
    },
    {
      number: "02",
      title: "Find your match",
      description:
        "Our matching system finds people whose skills and learning goals complement yours.",
    },
    {
      number: "03",
      title: "Start swapping",
      description:
        "Connect, schedule a session and exchange knowledge without exchanging money.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="bg-slate-50 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
            How it works
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Knowledge is your currency.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            No subscriptions. No expensive courses. Just people
            helping each other grow.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <Step
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;