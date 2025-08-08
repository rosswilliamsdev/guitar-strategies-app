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
  if (session) {
    if (session.user.role === "TEACHER") {
      redirect("/dashboard/teacher");
    } else if (session.user.role === "STUDENT") {
      redirect("/dashboard/student");
    } else if (session.user.role === "ADMIN") {
      redirect("/dashboard/admin");
    }
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
