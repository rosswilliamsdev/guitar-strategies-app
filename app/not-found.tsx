import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-display-xl font-display text-brand-black mb-4">
          404 - Page Not Found
        </h1>
        <p className="text-body text-brand-gray mb-8">
          The page you are looking for does not exist.
        </p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
