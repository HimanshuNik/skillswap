import type {
  AvailabilityData,
  SessionLength,
  TimeSlot,
} from "../../types/onboarding";

type AvailabilityStepProps = {
  data: AvailabilityData;
  onUpdate: (data: AvailabilityData) => void;
  onBack: () => void;
  onFinish: () => void;
};

const timeSlots: TimeSlot[] = [
  "Morning",
  "Afternoon",
  "Evening",
];

const sessionLengths: SessionLength[] = [
  30,
  60,
  90,
];

const AvailabilityStep = ({
  data,
  onUpdate,
  onBack,
  onFinish,
}: AvailabilityStepProps) => {
  const toggleSlot = (
    day: string,
    slot: TimeSlot
  ) => {
    const updatedSchedule = data.schedule.map(
      (dayAvailability) => {
        if (dayAvailability.day !== day) {
          return dayAvailability;
        }

        const slotExists =
          dayAvailability.slots.includes(slot);

        return {
          ...dayAvailability,

          slots: slotExists
            ? dayAvailability.slots.filter(
                (currentSlot) => currentSlot !== slot
              )
            : [...dayAvailability.slots, slot],
        };
      }
    );

    onUpdate({
      ...data,
      schedule: updatedSchedule,
    });
  };

  const hasAvailability = data.schedule.some(
    (day) => day.slots.length > 0
  );

  return (
    <div>
      <div className="mb-10">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
          Availability
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          When are you usually available?
        </h1>

        <p className="mt-4 text-slate-600">
          Choose the times that generally work best for
          SkillSwap sessions.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">

        {/* Schedule */}

        <div>
          <h2 className="font-semibold text-slate-950">
            Weekly availability
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select all time periods that usually work for you.
          </p>

          <div className="mt-6 space-y-3">
            {data.schedule.map((day) => (
              <div
                key={day.day}
                className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[120px_1fr]"
              >
                <div className="flex items-center">
                  <span className="font-semibold text-slate-700">
                    {day.day}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((slot) => {
                    const selected =
                      day.slots.includes(slot);

                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          toggleSlot(day.day, slot)
                        }
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                        }`}
                      >
                        {selected ? "✓ " : ""}
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session length */}

        <div className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="font-semibold text-slate-950">
            Preferred session length
          </h2>

          <div className="mt-4 flex flex-wrap gap-3">
            {sessionLengths.map((length) => {
              const selected =
                data.sessionLength === length;

              return (
                <button
                  key={length}
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...data,
                      sessionLength: length,
                    })
                  }
                  className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {length} minutes
                </button>
              );
            })}
          </div>
        </div>

        {/* Timezone */}

        <div className="mt-10 border-t border-slate-200 pt-8">
          <label
            htmlFor="timezone"
            className="block font-semibold text-slate-950"
          >
            Timezone
          </label>

          <p className="mt-1 text-sm text-slate-500">
            We'll use this when scheduling sessions.
          </p>

          <select
            id="timezone"
            value={data.timezone}
            onChange={(event) =>
              onUpdate({
                ...data,
                timezone: event.target.value,
              })
            }
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 sm:max-w-sm"
          >
            <option value="Asia/Kolkata">
              India — Asia/Kolkata
            </option>

            <option value="Europe/London">
              United Kingdom — Europe/London
            </option>

            <option value="America/New_York">
              USA — America/New_York
            </option>

            <option value="America/Los_Angeles">
              USA — America/Los_Angeles
            </option>

            <option value="Asia/Singapore">
              Singapore — Asia/Singapore
            </option>
          </select>
        </div>

      </div>

      {/* Navigation */}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={!hasAvailability}
          className="rounded-xl bg-emerald-500 px-7 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white"
        >
          Finish setup →
        </button>
      </div>
    </div>
  );
};

export default AvailabilityStep;