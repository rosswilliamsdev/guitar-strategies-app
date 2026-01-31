import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-blue-600 py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Level Up Your Lessons?
          </h2>

          <p className="text-xl text-blue-100 mb-8">
            Join the growing community of guitar teachers who are streamlining
            their practice and growing their business with our platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="px-8 py-3 text-lg bg-white text-blue-600 hover:bg-gray-100"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
