import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import { useRegister } from "../hooks/useAuth";

const registerFormSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens, and underscores only"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms and Privacy Policy",
  }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

const Register = () => {
  const registerMutation = useRegister();
  const [autoUsername, setAutoUsername] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (autoUsername) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 25);
      setValue("username", generated, { shouldValidate: false });
    }
  };

  const onSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate({
      name: values.name,
      username: values.username,
      email: values.email,
      password: values.password,
    });
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start exchanging skills and learning from people like you."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name", {
              onChange: handleNameChange,
            })}
            className={`w-full rounded-xl border bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
              errors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-xs font-medium text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-slate-700"
            >
              Username
            </label>
            <span className="text-xs text-slate-400">Public profile handle</span>
          </div>
          <input
            id="username"
            type="text"
            placeholder="choose_a_username"
            autoComplete="username"
            aria-invalid={errors.username ? "true" : "false"}
            aria-describedby={errors.username ? "username-error" : undefined}
            {...register("username", {
              onChange: () => setAutoUsername(false),
            })}
            className={`w-full rounded-xl border bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
              errors.username
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />
          {errors.username && (
            <p id="username-error" className="mt-1 text-xs font-medium text-red-600">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
            className={`w-full rounded-xl border bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
              errors.email
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/10"
            }`}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs font-medium text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a secure password"
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
          {errors.password ? (
            <p id="password-error" className="mt-1 text-xs font-medium text-red-600">
              {errors.password.message}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Must be at least 8 characters.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-start gap-3 pt-1">
            <input
              id="terms"
              type="checkbox"
              aria-invalid={errors.terms ? "true" : "false"}
              aria-describedby={errors.terms ? "terms-error" : undefined}
              {...register("terms")}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs leading-5 text-slate-600 sm:text-sm cursor-pointer">
              I agree to the Terms of Service and Privacy Policy.
            </label>
          </div>
          {errors.terms && (
            <p id="terms-error" className="mt-1 text-xs font-medium text-red-600">
              {errors.terms.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {registerMutation.isPending ? "Creating account..." : "Create account"}
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
