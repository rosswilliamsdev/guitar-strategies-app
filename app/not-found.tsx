'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-neutral-300 mb-2">404</h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
            Page Not Found
          </h2>
          <p className="text-neutral-600 max-w-md mx-auto">
            The page you are looking for doesn't exist or has been moved. 
            Please check the URL or return to the homepage.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={() => router.back()}
            className="inline-flex items-center justify-center min-w-[140px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-12 text-sm text-neutral-500">
          <p>
            Need help? Contact{" "}
            <a
              href="mailto:support@guitarstrategies.com"
              className="text-primary hover:text-turquoise-600 font-medium transition-colors"
            >
              support@guitarstrategies.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
