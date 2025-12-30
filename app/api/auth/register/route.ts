import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { z } from "zod";
import { prisma, dbQuery, criticalDbQuery } from "@/lib/db-with-retry";
import { apiLog } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["STUDENT", "TEACHER"], "Role must be STUDENT or TEACHER"),
  teacherId: z.string().optional(), // Required for students
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);
    const { name, email, password, role, teacherId } = validatedData;

    // For students, teacherId is required
    if (role === "STUDENT" && !teacherId) {
      apiLog.warn("Registration failed - student missing teacherId", { email });
      return NextResponse.json(
        { message: "Teacher ID is required for student registration" },
        { status: 400 }
      );
    }

    apiLog.info("Registration attempt", {
      email,
      role,
      teacherId,
    });

    // Check if user already exists
    const existingUser = await dbQuery(() =>
      prisma.user.findUnique({
        where: { email },
      })
    );

    if (existingUser) {
      apiLog.warn("Registration failed - email already exists", { email });
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with profile based on role
    const user = await criticalDbQuery(() =>
      prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          ...(role === "TEACHER" && {
            teacherProfile: {
              create: {
                isActive: true,
                isAdmin: true,
              },
            },
          }),
          ...(role === "STUDENT" &&
            teacherId && {
              studentProfile: {
                create: {
                  teacherId,
                  isActive: true,
                  instrument: "guitar",
                },
              },
            }),
        },
        include: {
          teacherProfile: true,
          studentProfile: true,
        },
      })
    );

    apiLog.info("User registered successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      {
        message: "Registration successful",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      apiLog.warn("Registration validation failed", { errors: error.issues });
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    apiLog.error("Registration error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
