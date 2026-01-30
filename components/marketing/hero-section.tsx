import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-brand-turquoise/10 to-white py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-display-xl md:text-6xl text-brand-black mb-6">
            Transform Your Teaching with{" "}
            <span className="text-brand-orange">Digital Tools</span>
          </h1>

          <p className="text-body-lg text-brand-gray mb-8 max-w-3xl mx-auto">
            Streamline lesson management, track student progress, and grow your
            guitar teaching business with our comprehensive platform designed
            specifically for music educators.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="px-8 py-3 text-lg">
                Sign Up Today
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="secondary"
                size="lg"
                className="px-8 py-3 text-lg"
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
