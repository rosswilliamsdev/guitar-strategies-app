import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { z } from "zod";
import { prisma, dbQuery, criticalDbQuery } from "@/lib/db-with-retry";
import { apiLog } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);
    const { name, email, password } = validatedData;

    apiLog.info("Teacher registration attempt", { email });

    // Check if user already exists
    const existingUser = await dbQuery(() =>
      prisma.user.findUnique({
        where: { email },
        include: {
          studentProfile: true,
        },
      })
    );

    if (existingUser) {
      if (existingUser.role === 'STUDENT' || existingUser.studentProfile) {
        apiLog.warn("Registration failed - email registered as student", { email });
        return NextResponse.json(
          { message: "This email is already registered as a student. Please use a different email for your teacher account." },
          { status: 400 }
        );
      }

      apiLog.warn("Registration failed - email already exists", { email });
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create teacher user with profile
    const user = await criticalDbQuery(() =>
      prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'TEACHER',
          teacherProfile: {
            create: {
              isActive: true,
              isAdmin: true,
            },
          },
        },
        include: {
          teacherProfile: true,
        },
      })
    );

    apiLog.info("Teacher registered successfully", {
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
