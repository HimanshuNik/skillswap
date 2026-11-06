import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useLogin, useForgotPassword } from "../hooks/useAuth";
import { Modal } from "../components/ui/Modal";

const loginFormSchema = z.object({
  email: z.string().min(1, "Please enter your email or username"),
  password: z.string().min(1, "Please enter your password"),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const forgotFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormValues = z.infer<typeof forgotFormSchema>;

const Login = () => {
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const forgotMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors },
    reset: resetForgot,
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      email: values.email,
      password: values.password,
    });
  };

  const onForgotSubmit = (values: ForgotFormValues) => {
    forgotMutation.mutate(
      { email: values.email },
      {
        onSuccess: () => {
          resetForgot();
          setShowForgotModal(false);
        },
      }
    );
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in and continue learning with your SkillSwap community."
    >
      <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email address or username
          </label>
          <div className="relative">
            <input
              id="email"
              type="text"
              autoComplete="username"
              placeholder="you@example.com"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
              className={`w-full rounded-xl border bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                errors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
              }`}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.email.message}
            </p>
          )}
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
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
              className={`w-full rounded-xl border bg-white px-4 py-3 pr-11 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                errors.password
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            {...register("remember")}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer">
            Remember me
          </label>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
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

      {/* Accessible Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset your password"
        description="Enter the email associated with your account and we'll send a password reset link."
      >
        <form onSubmit={handleSubmitForgot(onForgotSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700">
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              aria-invalid={forgotErrors.email ? "true" : "false"}
              aria-describedby={forgotErrors.email ? "forgot-email-error" : undefined}
              {...registerForgot("email")}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
            {forgotErrors.email && (
              <p id="forgot-email-error" className="mt-1 text-xs text-red-600">
                {forgotErrors.email.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotMutation.isPending}
              className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {forgotMutation.isPending ? "Sending..." : "Send link"}
            </button>
          </div>
        </form>
      </Modal>
    </AuthLayout>
  );
};

export default Login;
