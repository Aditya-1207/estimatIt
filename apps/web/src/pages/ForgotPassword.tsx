import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HardHat, Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "@estimatit/shared";
import { auth } from "../lib/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setErrorMsg("");
      await auth.resetPassword(data.email);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset email.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <HardHat className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {APP_NAME}
            </h1>
          </div>
        </div>

        {/* Forgot Password Form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email to receive a password reset link.
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <p>Reset link sent! Check your inbox.</p>
              </div>
              <Link
                href="/login"
                className="flex h-11 w-full items-center justify-center rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="engineer@example.com"
                    className={`h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                      errors.email
                        ? "border-destructive focus:border-destructive focus:ring-destructive"
                        : "border-input focus:border-primary focus:ring-primary"
                    }`}
                    {...register("email")}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <Link
                  href="/login"
                  className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
