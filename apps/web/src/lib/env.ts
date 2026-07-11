import { z } from "zod";

/**
 * Zod schema for validating environment variables at startup.
 * Fails fast with a clear error if any required vars are missing.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid URL")
    .min(1),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "VITE_SUPABASE_ANON_KEY is required"),
});

function validateEnv() {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✗ ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error(
      `\n❌ Invalid environment variables:\n${formatted}\n\nCopy .env.example to .env and fill in the values.\n`
    );

    throw new Error("Missing or invalid environment variables");
  }

  return result.data;
}

export const env = validateEnv();
