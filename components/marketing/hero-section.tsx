import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative py-20 bg-cover bg-center bg-no-repeat min-h-[600px] bg-mobile-hero md:bg-desktop-hero w-full">
      <div className="w-full px-4 relative z-10 h-full min-h-[600px] grid grid-cols-1 md:grid-cols-2 max-w-none md:max-w-7xl md:mx-auto">
        {/* Left column - empty for background image (hidden on mobile) */}
        <div className="hidden md:block"></div>

        {/* Right column - centered content */}
        <div className="flex items-center justify-center md:mr-20">
          <div className="max-w-2xl text-center px-4">
            <h1 className="font-display text-display-2xl text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-black mb-6 xl:whitespace-nowrap break-words">
              Transform Your Teaching
            </h1>

            <p className="text-base sm:text-body-lg text-black mb-8">
              Streamline lesson management, track student progress, and{" "}
              <strong>
                <i>grow your business</i>{" "}
              </strong>
              with our comprehensive platform designed specifically for music
              educators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="px-8 py-3 text-lg bg-primary text-white hover:bg-turquoise-600 hover:text-white"
                >
                  Sign Up Today
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 text-lg bg-white/10 border-black/30 text-black hover:bg-white/20 hover:text-black"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
