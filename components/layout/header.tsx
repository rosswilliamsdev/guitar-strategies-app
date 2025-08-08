import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-brand-black text-brand-white">
      <div className="container mx-auto px-4 ">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4 ">
            <Link href="/" className="font-display text-display-lg">
              Guitar Strategies
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="#features" className="text-white hover:text-gray-200">
              Features
            </Link>
            <Link href="#pricing" className="text-white hover:text-gray-200">
              Pricing
            </Link>
            <Link href="#contact" className="text-white hover:text-gray-200">
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
