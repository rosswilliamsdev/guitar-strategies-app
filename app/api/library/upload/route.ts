import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const difficulty = formData.get('difficulty') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const tags = formData.get('tags') as string;

    if (!file || !title || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, title, and category are required' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/ogg',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'audio/midi',
      'audio/x-midi'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not supported' 
      }, { status: 400 });
    }

    try {
      let fileUrl: string;
      
      // Check if Vercel Blob is configured
      if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN !== 'vercel_blob_rw_xxxxxxxxxxxxxxxxxxxx') {
        // Upload file to Vercel Blob
        const blob = await put(file.name, file, {
          access: 'public',
          addRandomSuffix: true,
        });
        fileUrl = blob.url;
      } else {
        // For development/testing: use a mock URL
        console.log('Vercel Blob not configured, using mock file URL');
        fileUrl = `https://mock-storage.example.com/files/${file.name}`;
      }

      // Create library item in database
      const libraryItem = await prisma.libraryItem.create({
        data: {
          title,
          description: description || null,
          fileName: file.name,
          fileSize: file.size,
          fileUrl,
          teacherId: teacherProfile.id,
          category: category as any,
          difficulty: difficulty || null,
          isPublic,
          tags: tags || null,
        }
      });

      return NextResponse.json({ 
        success: true, 
        item: libraryItem 
      }, { status: 201 });

    } catch (blobError) {
      console.error('Error uploading file:', blobError);
      return NextResponse.json({ 
        error: 'Failed to upload file. Please check your file storage configuration.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Library upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}