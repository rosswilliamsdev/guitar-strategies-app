// ========================================
// FILE: app/layout.tsx (Root Layout)
// ========================================
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Playfair_Display_SC } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Guitar Strategies",
    template: "%s | Guitar Strategies",
  },
  description:
    "Professional guitar lesson management for teachers and students",
  keywords: ["guitar", "lessons", "music", "education", "scheduling"],
  authors: [{ name: "Guitar Strategies" }],
  creator: "Guitar Strategies",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://guitarstrategies.com",
    title: "Guitar Strategies",
    description:
      "Professional guitar lesson management for teachers and students",
    siteName: "Guitar Strategies",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guitar Strategies",
    description:
      "Professional guitar lesson management for teachers and students",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-white font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
