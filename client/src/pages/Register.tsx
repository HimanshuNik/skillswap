import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Temporary frontend-only registration
    navigate("/onboarding");
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start exchanging skills and learning from people like you."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Full name
          </label>

          <input
            id="name"
            type="text"
            placeholder="Your full name"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Create a password"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />

          <p className="mt-2 text-xs text-slate-500">
            Use at least 8 characters.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <input id="terms" type="checkbox" className="mt-1 h-4 w-4" />

          <label htmlFor="terms" className="text-sm leading-6 text-slate-600">
            I agree to the Terms of Service and Privacy Policy.
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          Create account
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
