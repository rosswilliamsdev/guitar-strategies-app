import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LibraryList } from '@/components/library/library-list';
import { LibraryUpload } from '@/components/library/library-upload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { log, dbLog } from '@/lib/logger';

export const metadata = {
  title: 'Library - Guitar Strategies',
  description: 'Manage and access lesson materials, sheet music, and resources',
};

async function getLibraryData(teacherId: string) {
  try {
    const libraryItems = await prisma.libraryItem.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          include: { user: true }
        }
      }
    });

    return libraryItems.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      fileName: item.fileName,
      fileSize: item.fileSize,
      fileUrl: item.fileUrl,
      category: item.category,
      difficulty: item.difficulty,
      tags: item.tags ? JSON.parse(item.tags) : [],
      downloadCount: item.downloadCount,
      isPublic: item.isPublic,
      createdAt: item.createdAt.toLocaleDateString(),
      teacherName: item.teacher.user.name,
    }));
  } catch (error) {
    log.error('Error fetching library data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return [];
  }
}

export default async function LibraryPage() {
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

  // Get teacher profile to fetch library items
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

  const libraryItems = await getLibraryData(teacherProfile.id);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Resource Library
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage lesson materials, sheet music, and educational resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/library/bulk-upload">
            <Button variant="secondary">
              Bulk Upload
            </Button>
          </Link>
          <Link href="/library/upload">
            <Button>
              Upload New Resource
            </Button>
          </Link>
        </div>
      </div>


      {/* Library List */}
      <LibraryList items={libraryItems} />
    </div>
  );
}