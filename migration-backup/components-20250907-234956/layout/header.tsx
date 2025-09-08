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

          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="secondary">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
