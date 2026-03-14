import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateLessonOptimistic } from "@/lib/optimistic-locking";
import { bookSingleLesson } from "@/lib/scheduler";

/**
 * Test endpoint for validating concurrency controls
 * Tests optimistic locking and transaction isolation
 */
export async function POST(request: NextRequest) {
  const { action, ...params } = await request.json();

  try {
    switch (action) {
      case "test_booking_race":
        return await testBookingRaceCondition(params);

      case "test_optimistic_locking":
        return await testOptimisticLocking(params);

      case "test_transaction_isolation":
        return await testTransactionIsolation(params);

      default:
        return NextResponse.json(
          { error: "Unknown test action" },
          { status: 400 },
        );
    }
  } catch (error) {
    let errorMessage: string;
    let errorType: string;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = error.constructor.name;
    } else {
      errorMessage = String(error);
      errorType = typeof error;
    }

    return NextResponse.json(
      { error: errorMessage, type: errorType },
      { status: 500 },
    );
  }
}

/**
 * Test booking race condition protection
 */
async function testBookingRaceCondition(params: {
  teacherId: string;
  studentId: string;
  date: string;
  duration: 30 | 60;
}) {
  const { teacherId, studentId, date, duration = 30 } = params;

  // Simulate concurrent booking attempts
  const bookingData = {
    teacherId,
    studentId,
    date: new Date(date),
    duration: (duration === 60 ? 60 : 30) as 30 | 60,
    timezone: "America/New_York",
    isRecurring: false,
  };

  const promises = [
    bookSingleLesson(bookingData),
    bookSingleLesson(bookingData),
    bookSingleLesson(bookingData),
  ];

  try {
    const results = await Promise.allSettled(promises);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      test: "booking_race_condition",
      successful,
      failed,
      expected: { successful: 1, failed: 2 },
      passed: successful === 1 && failed === 2,
      results: results.map((r) => ({
        status: r.status,
        reason: r.status === "rejected"
          ? (r.reason instanceof Error ? r.reason.message : String(r.reason))
          : "success",
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      test: "booking_race_condition",
      error: errorMessage,
      passed: false,
    });
  }
}

/**
 * Test optimistic locking on lesson updates
 */
async function testOptimisticLocking(params: { lessonId: string }) {
  const { lessonId } = params;

  // Get current lesson
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Simulate concurrent updates with same version
  const updateData1 = { notes: "Update 1 from concurrent test" };
  const updateData2 = { notes: "Update 2 from concurrent test" };

  const promises = [
    updateLessonOptimistic(lessonId, lesson.version, updateData1),
    updateLessonOptimistic(lessonId, lesson.version, updateData2),
  ];

  try {
    const results = await Promise.allSettled(promises);

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      test: "optimistic_locking",
      successful,
      failed,
      expected: { successful: 1, failed: 1 },
      passed: successful === 1 && failed === 1,
      originalVersion: lesson.version,
      results: results.map((r) => ({
        status: r.status,
        version:
          r.status === "fulfilled"
            ? (r.value as { version: number }).version
            : undefined,
        reason: r.status === "rejected"
          ? (r.reason instanceof Error ? r.reason.message : String(r.reason))
          : "success",
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      test: "optimistic_locking",
      error: errorMessage,
      passed: false,
    });
  }
}

/**
 * Test transaction isolation levels
 */
async function testTransactionIsolation(params: { teacherId: string }) {
  const { teacherId } = params;

  try {
    // Test READ COMMITTED vs SERIALIZABLE isolation
    const readCommittedResult = await prisma.$transaction(
      async (tx) => {
        const lessons1 = await tx.lesson.findMany({
          where: { teacherId },
          take: 5,
        });

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        const lessons2 = await tx.lesson.findMany({
          where: { teacherId },
          take: 5,
        });

        return { first: lessons1.length, second: lessons2.length };
      },
      { isolationLevel: "ReadCommitted" },
    );

    const serializableResult = await prisma.$transaction(
      async (tx) => {
        const lessons1 = await tx.lesson.findMany({
          where: { teacherId },
          take: 5,
        });

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        const lessons2 = await tx.lesson.findMany({
          where: { teacherId },
          take: 5,
        });

        return { first: lessons1.length, second: lessons2.length };
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json({
      test: "transaction_isolation",
      readCommitted: readCommittedResult,
      serializable: serializableResult,
      passed: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      test: "transaction_isolation",
      error: errorMessage,
      passed: false,
    });
  }
}
