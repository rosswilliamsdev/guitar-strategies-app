// ========================================
// FILE: app/page.tsx (Home Page)
// ========================================
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { CTASection } from "@/components/marketing/cta-section";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Redirect authenticated users to their dashboard
  // All roles now use unified /dashboard route which handles role-based rendering
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
