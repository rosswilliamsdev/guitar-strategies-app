import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LibraryBulkUpload } from '@/components/library/library-bulk-upload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Bulk Upload - Library - Guitar Strategies',
  description: 'Upload multiple resources to your library at once',
};

export default async function BulkUploadPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only teachers can access this page
  if (session.user.role !== 'TEACHER') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Access Restricted</h1>
          <p className="text-muted-foreground">
            This page is only available to teachers. 
          </p>
          <div className="mt-4">
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Get teacher profile
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!teacherProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Teacher Profile Not Found</h1>
          <p className="text-muted-foreground">
            Unable to access library without a teacher profile.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/library">
          <Button variant="secondary" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Library
          </Button>
        </Link>
      </div>
      
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Bulk Upload Resources
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload multiple files to your library at once with bulk settings
        </p>
      </div>

      <LibraryBulkUpload teacherId={teacherProfile.id} />
    </div>
  );
}