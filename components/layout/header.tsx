import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-transparent text-white">
      <div className="container mx-auto px-4 ">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4 ">
            <Link href="/" className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="Guitar Strategies Logo"
                className="w-[40px] h-auto"
              />
              <span className="font-serif text-2xl font-semibold">
                Guitar Strategies
              </span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary text-white hover:bg-turquoise-600 hover:text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
