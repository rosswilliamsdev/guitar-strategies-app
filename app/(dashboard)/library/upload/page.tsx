import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LibraryUpload } from '@/components/library/library-upload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Upload Resource - Library',
  description: 'Upload new lesson materials and resources',
};

export default async function UploadPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only teachers can upload to library
  if (session.user.role !== 'TEACHER') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Access Restricted</h1>
          <p className="text-muted-foreground">
            Only teachers can upload library resources.
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
            Unable to upload without a teacher profile.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Upload Resource
          </h1>
          <p className="text-muted-foreground mt-2">
            Add new lesson materials, sheet music, and educational resources
          </p>
        </div>
        <Link href="/library">
          <Button variant="secondary">
            Back to Library
          </Button>
        </Link>
      </div>

      {/* Upload Form */}
      <LibraryUpload teacherId={teacherProfile.id} />
    </div>
  );
}