import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-border bg-background text-foreground">
      <div className="container mx-auto px-4 ">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4 ">
            <Link href="/" className="font-serif text-2xl font-semibold">
              Guitar Strategies
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="secondary">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
