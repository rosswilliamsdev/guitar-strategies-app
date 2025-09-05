import { z } from "zod";

/**
 * Environment Variable Validation System
 * 
 * This module validates all required environment variables at startup,
 * ensuring the application fails fast with clear error messages if
 * configuration is missing or invalid.
 */

// Define the schema for environment variables
const envSchema = z.object({
  // Database Configuration (Required)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      "DATABASE_URL must be a valid PostgreSQL connection string"
    ),

  // NextAuth Configuration (Required)
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .refine(
      (secret) => secret !== "your-secret-key-here-change-in-production",
      "NEXTAUTH_SECRET must be changed from the default placeholder value"
    ),
  
  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .default("http://localhost:3000"),

  // Node Environment (Optional with default)
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Email Service (Optional but validated if present)
  RESEND_API_KEY: z
    .string()
    .optional()
    .refine(
      (key) => !key || key.startsWith("re_") || key === "test",
      "RESEND_API_KEY must start with 're_' if provided"
    ),

  // File Storage (Optional but validated if present)
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .optional()
    .refine(
      (token) => !token || token.startsWith("vercel_blob_"),
      "BLOB_READ_WRITE_TOKEN must start with 'vercel_blob_' if provided"
    ),
});

// Type for validated environment variables
export type ValidatedEnv = z.infer<typeof envSchema>;

// Validation result type
export interface EnvValidationResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  env?: ValidatedEnv;
}

/**
 * Validates environment variables and returns detailed results
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse and validate environment variables
    const env = envSchema.parse(process.env);

    // Add warnings for optional but recommended configurations
    if (!env.RESEND_API_KEY) {
      warnings.push(
        "RESEND_API_KEY is not configured - email notifications will be disabled"
      );
    }

    if (!env.BLOB_READ_WRITE_TOKEN) {
      warnings.push(
        "BLOB_READ_WRITE_TOKEN is not configured - file uploads will be disabled"
      );
    }

    if (env.NODE_ENV === "production") {
      // Production-specific validations
      if (!env.NEXTAUTH_URL || env.NEXTAUTH_URL.includes("localhost")) {
        errors.push(
          "NEXTAUTH_URL must be set to production domain in production environment"
        );
      }

      if (env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("127.0.0.1")) {
        warnings.push(
          "DATABASE_URL appears to be using localhost in production - ensure this is intentional"
        );
      }

      // Check for secure secret in production
      if (env.NEXTAUTH_SECRET.length < 64) {
        warnings.push(
          "Consider using a longer NEXTAUTH_SECRET (64+ characters) in production for enhanced security"
        );
      }
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    return { success: true, warnings, env };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors into readable messages
      const zodErrors = error.errors.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
      return { success: false, errors: zodErrors, warnings };
    }

    // Unknown error
    return {
      success: false,
      errors: [`Unexpected error validating environment: ${error}`],
      warnings,
    };
  }
}

/**
 * Validates environment and throws if invalid
 * Use this for application startup
 */
export function validateEnvOrThrow(): ValidatedEnv {
  const result = validateEnv();

  if (!result.success) {
    console.error("❌ Environment Validation Failed:");
    result.errors?.forEach((error) => console.error(`  - ${error}`));
    
    throw new Error(
      `Environment validation failed with ${result.errors?.length || 0} error(s). ` +
      `Please check your .env file and ensure all required variables are set correctly.`
    );
  }

  // Log warnings if any
  if (result.warnings && result.warnings.length > 0) {
    console.warn("⚠️  Environment Validation Warnings:");
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  console.log("✅ Environment validation successful");
  return result.env!;
}

/**
 * Get validated environment variables (cached after first validation)
 */
let cachedEnv: ValidatedEnv | null = null;

export function getValidatedEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnvOrThrow();
  }
  return cachedEnv;
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  const env = getValidatedEnv();
  return !!env.RESEND_API_KEY;
}

/**
 * Check if file storage is configured
 */
export function isFileStorageConfigured(): boolean {
  const env = getValidatedEnv();
  return !!env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Get environment mode
 */
export function getEnvironmentMode(): "development" | "test" | "production" {
  const env = getValidatedEnv();
  return env.NODE_ENV;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironmentMode() === "production";
}

/**
 * Format validation results for logging
 */
export function formatValidationResults(result: EnvValidationResult): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(60));
  lines.push("ENVIRONMENT VALIDATION RESULTS");
  lines.push("=".repeat(60));
  
  if (result.success) {
    lines.push("Status: ✅ SUCCESS");
  } else {
    lines.push("Status: ❌ FAILED");
  }
  
  if (result.errors && result.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    result.errors.forEach((error) => lines.push(`  ❌ ${error}`));
  }
  
  if (result.warnings && result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    result.warnings.forEach((warning) => lines.push(`  ⚠️  ${warning}`));
  }
  
  lines.push("=".repeat(60));
  
  return lines.join("\n");
}