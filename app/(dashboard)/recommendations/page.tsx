import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RecommendationsList } from '@/components/recommendations/recommendations-list';
import { StudentRecommendationsList } from '@/components/recommendations/student-recommendations-list';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Recommendations - Guitar Strategies',
  description: 'Manage gear and resource recommendations for students',
};

async function getRecommendationsData(teacherId: string) {
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { 
        teacherId,
        isArchived: false 
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        teacher: {
          include: { user: true }
        }
      }
    });

    return recommendations.map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      link: rec.link,
      category: rec.category,
      price: rec.price,
      priority: rec.priority,
      isArchived: rec.isArchived,
      createdAt: rec.createdAt.toLocaleDateString(),
      teacherName: rec.teacher.user.name,
    }));
  } catch (error) {
    console.error('Error fetching recommendations data:', error);
    return [];
  }
}

async function getStudentRecommendationsData(studentId: string) {
  try {
    // Get student's teacher recommendations
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        teacher: {
          include: {
            recommendations: {
              where: { isArchived: false },
              orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
              ]
            },
            user: true
          }
        }
      }
    });

    if (!studentProfile || !studentProfile.teacher) {
      return { recommendations: [], teacherName: 'Unknown Teacher' };
    }

    const recommendations = studentProfile.teacher.recommendations.map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      link: rec.link,
      category: rec.category,
      price: rec.price,
      priority: rec.priority,
      isArchived: rec.isArchived,
      createdAt: rec.createdAt.toLocaleDateString(),
    }));

    return {
      recommendations,
      teacherName: studentProfile.teacher.user.name,
    };
  } catch (error) {
    console.error('Error fetching student recommendations data:', error);
    return { recommendations: [], teacherName: 'Unknown Teacher' };
  }
}

export default async function RecommendationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Handle different user roles
  if (session.user.role === 'TEACHER') {
    // Teacher view - manage recommendations
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="p-6">
            <h1 className="text-2xl font-semibold text-foreground mb-4">Teacher Profile Not Found</h1>
            <p className="text-muted-foreground">
              Unable to access recommendations without a teacher profile.
            </p>
          </Card>
        </div>
      );
    }

    const recommendations = await getRecommendationsData(teacherProfile.id);

    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Student Recommendations
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage gear and resource recommendations for your students
            </p>
          </div>
          <Link href="/recommendations/new">
            <Button>
              Add New Recommendation
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Active</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Gear</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.category === 'GEAR').length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Books</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.category === 'BOOKS').length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Software</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.category === 'SOFTWARE').length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">High Priority</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.priority >= 4).length}
            </p>
          </Card>
        </div>

        {/* Recommendations List */}
        <RecommendationsList items={recommendations} teacherId={teacherProfile.id} />
      </div>
    );
  } else if (session.user.role === 'STUDENT') {
    // Student view - view teacher's recommendations
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!studentProfile) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="p-6">
            <h1 className="text-2xl font-semibold text-foreground mb-4">Student Profile Not Found</h1>
            <p className="text-muted-foreground">
              Unable to access recommendations without a student profile.
            </p>
          </Card>
        </div>
      );
    }

    const { recommendations, teacherName } = await getStudentRecommendationsData(studentProfile.id);

    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Recommendations from {teacherName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Gear, books, and resources recommended by your teacher
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Recommendations</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Essential Items</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.priority === 5).length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">High Priority</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.priority >= 4).length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">With Links</h3>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {recommendations.filter(r => r.link).length}
            </p>
          </Card>
        </div>

        {/* Student Recommendations List */}
        <StudentRecommendationsList items={recommendations} teacherName={teacherName} />
      </div>
    );
  } else {
    // Admin or other roles
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Access Restricted</h1>
          <p className="text-muted-foreground">
            This page is only available to teachers and students.
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
}