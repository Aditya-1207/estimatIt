import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HardHat, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "@estimatit/shared";
import { auth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  // Check if we actually have an active recovery session
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setCheckingLink(false);
      } else if (!session) {
        // If not in recovery and no session, this link might be invalid or expired
        setCheckingLink(false);
        setErrorMsg("The password reset link is invalid or has expired. Please request a new one.");
      } else {
        setCheckingLink(false);
      }
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      setErrorMsg("");
      await auth.updatePassword(data.password);
      setSuccess(true);
      // Automatically redirect after a few seconds
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
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

        {/* Reset Password Form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Update Password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your new password below.
          </p>

          {checkingLink ? (
            <div className="mt-6 flex flex-col items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Checking reset link...</p>
            </div>
          ) : success ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <p>Password updated successfully! Redirecting...</p>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className={`h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                      errors.password
                        ? "border-destructive focus:border-destructive focus:ring-destructive"
                        : "border-input focus:border-primary focus:ring-primary"
                    }`}
                    {...register("password")}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-foreground"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className={`h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                      errors.confirmPassword
                        ? "border-destructive focus:border-destructive focus:ring-destructive"
                        : "border-input focus:border-primary focus:ring-primary"
                    }`}
                    {...register("confirmPassword")}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !!errorMsg.includes("expired")}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
                
                {errorMsg.includes("expired") && (
                  <Link
                    href="/forgot-password"
                    className="flex h-11 w-full items-center justify-center rounded-lg border border-input bg-background text-sm font-medium hover:bg-accent"
                  >
                    Request New Link
                  </Link>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
