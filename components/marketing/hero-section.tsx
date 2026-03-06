import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section
      className="relative py-20 bg-cover bg-center bg-no-repeat min-h-[600px] flex items-center"
      style={{ backgroundImage: "url(/guitar-hero.jpg)" }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50"></div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-display-xl text-4xl md:text-6xl text-white mb-6">
            Transform Your Teaching
          </h1>

          <p className="text-body-lg text-white mb-8 max-w-3xl mx-auto">
            Streamline lesson management, track student progress, and{" "}
            <strong>
              <i>grow your business</i>{" "}
            </strong>
            with our comprehensive platform designed specifically for music
            educators.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
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
                className="px-8 py-3 text-lg bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
