import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createStudentChecklistSchema } from "@/lib/validations";
import { z } from "zod";
import { apiLog, dbLog } from '@/lib/logger';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/student-checklists - Get all checklists for a student
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["STUDENT", "TEACHER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const studentId = searchParams.get("studentId"); // For teachers to specify which student

    let targetStudentId: string;

    if (session.user.role === "STUDENT") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 }
        );
      }
      
      targetStudentId = studentProfile.id;
    } else if (session.user.role === "TEACHER") {
      if (!studentId) {
        return NextResponse.json(
          { error: "studentId parameter required for teachers" },
          { status: 400 }
        );
      }

      // Verify the teacher has access to this student
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacherProfile) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      const studentProfile = await prisma.studentProfile.findFirst({
        where: { 
          id: studentId,
          teacherId: teacherProfile.id 
        },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student not found or not assigned to you" },
          { status: 404 }
        );
      }

      targetStudentId = studentProfile.id;
    } else {
      // Admin - require studentId parameter
      if (!studentId) {
        return NextResponse.json(
          { error: "studentId parameter required" },
          { status: 400 }
        );
      }
      targetStudentId = studentId;
    }

    const whereClause: any = {
      studentId: targetStudentId,
      ...(includeArchived ? {} : { isArchived: false }),
    };

    // Fetch student checklists
    const checklists = await prisma.studentChecklist.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        creator: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch teacher curricula assigned to this student
    let curricula: any[] = [];
    if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
      // Get the teacher ID for this student
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: targetStudentId },
        select: { teacherId: true }
      });

      if (studentProfile?.teacherId) {
        curricula = await prisma.curriculum.findMany({
          where: {
            teacherId: studentProfile.teacherId,
            isActive: true,
            isPublished: true, // Only include published curricula
          },
          include: {
            sections: {
              include: {
                items: {
                  orderBy: { sortOrder: "asc" },
                }
              },
              orderBy: { sortOrder: "asc" }
            },
            teacher: {
              select: {
                userId: true,
                user: {
                  select: { name: true, role: true }
                }
              }
            },
            studentProgress: {
              where: {
                studentId: targetStudentId
              },
              include: {
                itemProgress: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    // Calculate completion stats for each checklist
    const checklistsWithStats = checklists.map((checklist) => {
      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        (item) => item.isCompleted
      ).length;
      const progressPercent =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...checklist,
        stats: {
          totalItems,
          completedItems,
          progressPercent,
        },
      };
    });

    // Transform curricula to match checklist format for lesson form
    const curriculaAsChecklists = curricula.map((curriculum) => {
      // Get the student progress for this curriculum
      const studentProgress = curriculum.studentProgress?.[0]; // Should only be one progress record per student per curriculum

      // Flatten all items from all sections
      const allItems = curriculum.sections.flatMap((section: any) =>
        section.items.map((item: any) => {
          // Find the progress for this specific item
          const itemProgress = studentProgress?.itemProgress?.find((progress: any) => progress.itemId === item.id);
          const isCompleted = itemProgress?.status === "COMPLETED";

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            isCompleted: isCompleted,
            completedAt: itemProgress?.completedAt || null,
            sortOrder: item.sortOrder,
          };
        })
      );

      const totalItems = allItems.length;
      const completedItems = allItems.filter(item => item.isCompleted).length;
      const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        id: curriculum.id,
        title: curriculum.title,
        isActive: curriculum.isActive,
        isArchived: false,
        createdAt: curriculum.createdAt,
        updatedAt: curriculum.updatedAt,
        studentId: targetStudentId,
        createdBy: curriculum.teacher.userId,
        createdByRole: "TEACHER",
        creator: {
          name: curriculum.teacher.user.name,
          role: curriculum.teacher.user.role
        },
        items: allItems,
        stats: {
          totalItems,
          completedItems,
          progressPercent,
        }
      };
    });

    // Combine checklists and curricula
    const allChecklists = [...checklistsWithStats, ...curriculaAsChecklists];

    return NextResponse.json({ checklists: allChecklists });
  } catch (error) {
    apiLog.error('Error fetching student checklists:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to fetch checklists" },
      { status: 500 }
    );
  }
}

// POST /api/student-checklists - Create a new checklist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["STUDENT", "TEACHER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createStudentChecklistSchema.parse(body);

    let targetStudentId: string;

    if (session.user.role === "STUDENT") {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student profile not found" },
          { status: 404 }
        );
      }
      
      targetStudentId = studentProfile.id;
    } else if (session.user.role === "TEACHER") {
      // Teachers need to specify which student the checklist is for
      if (!body.studentId) {
        return NextResponse.json(
          { error: "studentId is required for teachers" },
          { status: 400 }
        );
      }

      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!teacherProfile) {
        return NextResponse.json(
          { error: "Teacher profile not found" },
          { status: 404 }
        );
      }

      // Verify the teacher has access to this student
      const studentProfile = await prisma.studentProfile.findFirst({
        where: { 
          id: body.studentId,
          teacherId: teacherProfile.id 
        },
      });

      if (!studentProfile) {
        return NextResponse.json(
          { error: "Student not found or not assigned to you" },
          { status: 404 }
        );
      }

      targetStudentId = studentProfile.id;
    } else {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 403 }
      );
    }

    const checklist = await prisma.studentChecklist.create({
      data: {
        ...validatedData,
        studentId: targetStudentId,
        createdBy: session.user.id,
        createdByRole: session.user.role,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    apiLog.error('Error creating checklist:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: "Failed to create checklist" },
      { status: 500 }
    );
  }
}