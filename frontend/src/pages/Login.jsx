
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form);

      const destination = location.state?.from?.pathname || "/";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10 transition-colors duration-200">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle showLabel />
      </div>

      <div className="w-full max-w-[440px]">
        {/* Brand */}
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm transition-colors duration-200">
            <BookOpenCheck size={23} />
          </div>

          <span className="text-2xl font-bold tracking-tight text-ink transition-colors duration-200">
            Sadhana
          </span>
        </Link>

        {/* Login form */}
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft transition-colors duration-200 sm:p-9">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Welcome back
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Sign in to your account
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Continue your preparation right where you left off.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 transition-colors duration-200 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-ink"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-ink"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-line bg-field px-3.5 py-3 pr-12 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition-colors hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-on-brand transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}

              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>

          {/* Signup link */}
          <p className="mt-6 text-center text-sm text-muted">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              Create one
            </Link>
          </p>
        </section>

        {/* Footer */}
        <p className="mt-6 text-center text-xs leading-5 text-muted">
          A calm space for focused practice and steady progress.
        </p>
      </div>
    </main>
  );
}
