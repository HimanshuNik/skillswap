import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AuthLayout from "../components/auth/AuthLayout";
import { useResetPassword } from "../hooks/useAuth";

const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const resetMutation = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: ResetPasswordFormValues) => {
    resetMutation.mutate({
      token,
      password: values.password,
    });
  };

  if (!token) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
        description="The password reset link is invalid or incomplete."
      >
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Please request a new reset link from the sign in page.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-block rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Create a new, strong password to regain access to your account."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            {...register("password")}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
            {...register("confirmPassword")}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={resetMutation.isPending}
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
        >
          {resetMutation.isPending ? "Updating password..." : "Reset password"}
        </button>

        <p className="pt-4 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;

