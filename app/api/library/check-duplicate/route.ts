import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get('fileName');
    const fileNames = searchParams.get('fileNames');
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
    }

    // Check for single file
    if (fileName) {
      const existingFile = await prisma.libraryItem.findFirst({
        where: {
          teacherId,
          fileName: fileName
        }
      });

      return NextResponse.json({
        exists: !!existingFile,
        fileName: fileName
      });
    }

    // Check for multiple files (bulk upload)
    if (fileNames) {
      const fileNameArray = fileNames.split(',').map(name => name.trim());

      const existingFiles = await prisma.libraryItem.findMany({
        where: {
          teacherId,
          fileName: {
            in: fileNameArray
          }
        },
        select: {
          fileName: true
        }
      });

      const existingFileNames = existingFiles.map(f => f.fileName);

      return NextResponse.json({
        existingFiles: existingFileNames,
        count: existingFileNames.length
      });
    }

    return NextResponse.json({ error: 'fileName or fileNames parameter required' }, { status: 400 });

  } catch (error) {
    apiLog.error('Check duplicate error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
