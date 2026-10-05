import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Temporary frontend-only login
    navigate("/dashboard");
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in and continue learning with your SkillSwap community."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <button
              type="button"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Forgot password?
            </button>
          </div>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </div>

        <div className="flex items-center gap-2">
          <input id="remember" type="checkbox" className="h-4 w-4" />

          <label htmlFor="remember" className="text-sm text-slate-600">
            Remember me
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          Sign in
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
