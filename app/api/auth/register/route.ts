import { NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { z } from 'zod';
import { prisma, dbQuery, criticalDbQuery } from '@/lib/db-with-retry';
import { apiLog } from '@/lib/logger';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['STUDENT', 'TEACHER'], {
    errorMap: () => ({ message: 'Role must be STUDENT or TEACHER' }),
  }),
  teacherId: z.string().optional(), // Required for students
  teacherType: z.enum(['solo', 'join', 'found']).optional(), // For teachers
  organizationId: z.string().optional(), // For joining existing org
  organizationName: z.string().optional(), // For founding new org
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);
    const { name, email, password, role, teacherId, teacherType, organizationId, organizationName } = validatedData;

    // For students, teacherId is required
    if (role === 'STUDENT' && !teacherId) {
      apiLog.warn('Registration failed - student missing teacherId', { email });
      return NextResponse.json(
        { message: 'Teacher ID is required for student registration' },
        { status: 400 }
      );
    }

    // For teachers, validate based on teacher type
    if (role === 'TEACHER') {
      if (!teacherType) {
        return NextResponse.json(
          { message: 'Teacher type is required' },
          { status: 400 }
        );
      }

      if (teacherType === 'join' && !organizationId) {
        return NextResponse.json(
          { message: 'Organization selection is required' },
          { status: 400 }
        );
      }

      if (teacherType === 'found' && !organizationName) {
        return NextResponse.json(
          { message: 'Organization name is required' },
          { status: 400 }
        );
      }
    }

    apiLog.info('Registration attempt', { email, role, teacherId, teacherType, organizationName });

    // Check if user already exists
    const existingUser = await dbQuery(() =>
      prisma.user.findUnique({
        where: { email },
      })
    );

    if (existingUser) {
      apiLog.warn('Registration failed - email already exists', { email });
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Handle organization founding/joining for teachers
    let finalOrganizationId: string | undefined;
    let finalOrganizationName: string | undefined;
    let isOrgFounder = false;
    let isSoloTeacher = false;
    let isAdmin = false;

    if (role === 'TEACHER' && teacherType) {
      if (teacherType === 'solo') {
        isSoloTeacher = true;
        isAdmin = true;
      } else if (teacherType === 'found' && organizationName) {
        // Create new organization
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Check if organization already exists
        const existingOrg = await dbQuery(() =>
          prisma.organization.findFirst({
            where: {
              OR: [
                { name: organizationName },
                { slug: slug }
              ]
            }
          })
        );

        if (existingOrg) {
          return NextResponse.json(
            { message: 'An organization with this name already exists' },
            { status: 400 }
          );
        }

        isOrgFounder = true;
        isAdmin = true; // Founders get admin privileges
      } else if (teacherType === 'join' && organizationId) {
        // Verify organization exists
        const existingOrg = await dbQuery(() =>
          prisma.organization.findUnique({
            where: { id: organizationId }
          })
        );

        if (!existingOrg) {
          return NextResponse.json(
            { message: 'Selected organization not found' },
            { status: 404 }
          );
        }

        finalOrganizationId = existingOrg.id;
        finalOrganizationName = existingOrg.name;
      }
    }

    // Create user with profile based on role
    const user = await criticalDbQuery(() =>
      prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          ...(role === 'TEACHER' && teacherType === 'found' && organizationName && {
            // Create organization and teacher profile together for founders
            foundedOrganizations: {
              create: {
                name: organizationName,
                slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
              },
            },
            teacherProfile: {
              create: {
                isActive: true,
                isSoloTeacher: false,
                isOrgFounder: true,
                isAdmin: true,
              },
            },
          }),
          ...(role === 'TEACHER' && teacherType !== 'found' && {
            teacherProfile: {
              create: {
                isActive: true,
                isSoloTeacher,
                isOrgFounder: false,
                isAdmin,
                organizationId: finalOrganizationId,
                organizationName: finalOrganizationName || null,
              },
            },
          }),
          ...(role === 'STUDENT' && teacherId && {
            studentProfile: {
              create: {
                teacherId,
                isActive: true,
                instrument: 'guitar',
              },
            },
          }),
        },
        include: {
          teacherProfile: true,
          foundedOrganizations: true,
        },
      })
    );

    // Link teacher profile to founded organization if applicable
    if (role === 'TEACHER' && teacherType === 'found' && user.foundedOrganizations && user.foundedOrganizations.length > 0) {
      const foundedOrg = user.foundedOrganizations[0];
      await criticalDbQuery(() =>
        prisma.teacherProfile.update({
          where: { userId: user.id },
          data: {
            organizationId: foundedOrg.id,
            organizationName: foundedOrg.name,
          },
        })
      );
    }

    apiLog.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      apiLog.warn('Registration validation failed', { errors: error.errors });
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      );
    }

    apiLog.error('Registration error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}