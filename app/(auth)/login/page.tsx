import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Login",
  description: "Sign in to your Guitar Strategies account",
};

interface LoginPageProps {
  searchParams: Promise<{
    reset?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const showResetSuccess = params?.reset === "success";

  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {showResetSuccess && (
        <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
          Password reset successful! You can now log in with your new password.
        </div>
      )}

      <LoginForm />

      <div className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-turquoise-600 hover:text-turquoise-700 font-medium"
        >
          Forgot your password?
        </Link>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-turquoise-600 hover:text-turquoise-700 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </Card>
  );
}
