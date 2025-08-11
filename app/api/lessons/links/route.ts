import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      console.error('Unauthorized access to links API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json();
    console.log('Links API request body:', JSON.stringify(requestBody, null, 2));
    
    const { links } = requestBody;

    if (!links || !Array.isArray(links) || links.length === 0) {
      console.error('Invalid links array:', links);
      return NextResponse.json({ error: 'Links array is required' }, { status: 400 });
    }

    const lessonId = links[0]?.lessonId;
    if (!lessonId) {
      console.error('Missing lesson ID in links:', links[0]);
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    console.log('Processing links for lesson:', lessonId);

    // Verify the teacher owns this lesson
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        teacherId: teacherProfile.id
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found or access denied' }, { status: 404 });
    }

    // Create all links
    console.log('Creating links with data:', links.map(link => ({
      lessonId: link.lessonId,
      title: link.title,
      url: link.url,
      description: link.description || null,
      linkType: link.linkType || 'WEBSITE',
    })));

    const createdLinks = await Promise.all(
      links.map(async (link) => {
        try {
          const linkData = {
            lessonId: link.lessonId,
            title: link.title,
            url: link.url,
            description: link.description || null,
            linkType: link.linkType || 'WEBSITE',
          };
          console.log('Creating link:', linkData);
          
          const createdLink = await prisma.lessonLink.create({
            data: linkData
          });
          
          console.log('Successfully created link:', createdLink);
          return createdLink;
        } catch (linkError) {
          console.error('Error creating individual link:', linkError, 'Link data:', link);
          throw linkError;
        }
      })
    );

    return NextResponse.json({ links: createdLinks });
  } catch (error) {
    console.error('Error creating links:', error);
    return NextResponse.json({ 
      error: 'Failed to create links', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}