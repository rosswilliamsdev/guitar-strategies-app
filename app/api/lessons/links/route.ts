import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      console.error('Unauthorized access to links API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json();
    apiLog.info('Links API request body:', JSON.stringify(requestBody, null, 2));
    
    const { links } = requestBody;

    if (!links || !Array.isArray(links) || links.length === 0) {
      apiLog.error('Invalid links array:', {
        error: links instanceof Error ? links.message : String(links),
        stack: links instanceof Error ? links.stack : undefined
      });
      return NextResponse.json({ error: 'Links array is required' }, { status: 400 });
    }

    const lessonId = links[0]?.lessonId;
    if (!lessonId) {
      apiLog.error('Missing lesson ID in links:', {
        error: links[0] instanceof Error ? links[0].message : String(links[0]),
        stack: links[0] instanceof Error ? links[0].stack : undefined
      });
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    apiLog.info('Processing links for lesson:', lessonId);

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
    apiLog.info('Creating lesson links', {
      linkCount: links.length,
      lessonId: lessonId,
      links: links.map(link => ({
        lessonId: link.lessonId,
        title: link.title,
        url: link.url,
        description: link.description || null,
        linkType: link.linkType || 'WEBSITE',
      }))
    });

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
          apiLog.info('Creating link:', linkData);
          
          const createdLink = await prisma.lessonLink.create({
            data: linkData
          });
          
          apiLog.info('Successfully created link:', createdLink);
          return createdLink;
        } catch (linkError) {
          apiLog.error('Error creating individual link', {
            error: linkError instanceof Error ? linkError.message : String(linkError),
            stack: linkError instanceof Error ? linkError.stack : undefined,
            linkData: link
          });
          throw linkError;
        }
      })
    );

    return NextResponse.json({ links: createdLinks });
  } catch (error) {
    apiLog.error('Error creating links:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Failed to create links', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json();
    const { lessonId, links } = requestBody;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

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

    // Delete all existing links for this lesson and create new ones
    await prisma.lessonLink.deleteMany({
      where: { lessonId: lessonId }
    });

    // Create new links if any
    let createdLinks = [];
    if (links && Array.isArray(links) && links.length > 0) {
      createdLinks = await Promise.all(
        links.map(async (link) => {
          const linkData = {
            lessonId: lessonId,
            title: link.title,
            url: link.url,
            description: link.description || null,
            linkType: link.linkType || 'WEBSITE',
          };
          
          return await prisma.lessonLink.create({
            data: linkData
          });
        })
      );
    }

    return NextResponse.json({ links: createdLinks });
  } catch (error) {
    apiLog.error('Error updating links:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Failed to update links', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}