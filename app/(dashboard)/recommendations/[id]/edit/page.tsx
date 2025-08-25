import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RecommendationForm } from '@/components/recommendations/recommendation-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Edit Recommendation - Guitar Strategies',
  description: 'Edit gear and resource recommendation',
};

export default async function EditRecommendationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only teachers can edit recommendations
  if (session.user.role !== 'TEACHER') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Access Restricted</h1>
          <p className="text-muted-foreground">
            Only teachers can edit recommendations.
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
            Unable to edit recommendations without a teacher profile.
          </p>
        </Card>
      </div>
    );
  }

  // Get the recommendation
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: params.id },
    include: {
      teacher: true
    }
  });

  if (!recommendation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Recommendation Not Found</h1>
          <p className="text-muted-foreground">
            The recommendation you&apos;re looking for doesn&apos;t exist.
          </p>
          <div className="mt-4">
            <Link href="/recommendations">
              <Button>Back to Recommendations</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Check if teacher owns this recommendation
  if (recommendation.teacher.userId !== session.user.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You can only edit your own recommendations.
          </p>
          <div className="mt-4">
            <Link href="/recommendations">
              <Button>Back to Recommendations</Button>
            </Link>
          </div>
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
            Edit Recommendation
          </h1>
          <p className="text-muted-foreground mt-2">
            Update your recommendation: {recommendation.title}
          </p>
        </div>
        <Link href="/recommendations">
          <Button variant="secondary">
            Back to Recommendations
          </Button>
        </Link>
      </div>

      {/* Form */}
      <RecommendationForm 
        teacherId={teacherProfile.id} 
        recommendation={{
          id: recommendation.id,
          title: recommendation.title,
          description: recommendation.description,
          link: recommendation.link || undefined,
          category: recommendation.category,
          price: recommendation.price || undefined,
          priority: recommendation.priority,
        }}
      />
    </div>
  );
}