// Test script to verify booking success modal functionality
// Run this after logging in as a student user

const testBookingModal = async () => {
  console.log("Testing Booking Success Modal...\n");

  // 1. First, get the teacher ID for the student
  const sessionResponse = await fetch("http://localhost:3002/api/auth/session", {
    credentials: "include",
  });
  const session = await sessionResponse.json();
  
  if (!session?.user) {
    console.error("❌ Not logged in. Please log in as student@guitarstrategies.com first");
    return;
  }

  if (session.user.role !== "STUDENT") {
    console.error("❌ Must be logged in as a student to test booking");
    return;
  }

  console.log(`✅ Logged in as: ${session.user.email} (${session.user.role})`);
  
  // Get student's teacher ID
  const teacherId = session.user.studentProfile?.teacherId;
  if (!teacherId) {
    console.error("❌ Student has no assigned teacher");
    return;
  }

  console.log(`✅ Teacher ID: ${teacherId}`);

  // 2. Test single lesson booking
  console.log("\n📚 Testing Single Lesson Booking...");
  
  // Set a date for next week at 3 PM
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(15, 0, 0, 0);

  const singleBookingData = {
    teacherId: teacherId,
    date: nextWeek.toISOString(),
    duration: 30,
    timezone: "America/New_York",
    isRecurring: false,
  };

  try {
    const response = await fetch("http://localhost:3002/api/lessons/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(singleBookingData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Single lesson booked successfully!");
      console.log("Response structure:");
      console.log(JSON.stringify(result, null, 2));
      
      // Verify response has expected fields for modal
      const hasRequiredFields = 
        result.type === 'single' &&
        result.lesson &&
        result.lesson.date &&
        result.lesson.duration;
      
      if (hasRequiredFields) {
        console.log("✅ Response has all required fields for modal display");
      } else {
        console.log("⚠️  Response missing some fields for modal");
      }
    } else {
      console.error("❌ Booking failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error during booking:", error.message);
  }

  // 3. Test recurring lesson booking
  console.log("\n🔄 Testing Recurring Lesson Booking...");
  
  // Set a date for next Monday at 4 PM
  const nextMonday = new Date();
  const daysUntilMonday = (1 - nextMonday.getDay() + 7) % 7;
  nextMonday.setDate(nextMonday.getDate() + (daysUntilMonday || 7));
  nextMonday.setHours(16, 0, 0, 0);

  const recurringBookingData = {
    teacherId: teacherId,
    date: nextMonday.toISOString(),
    duration: 60,
    timezone: "America/New_York",
    isRecurring: true,
  };

  try {
    const response = await fetch("http://localhost:3002/api/lessons/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(recurringBookingData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Recurring lessons booked successfully!");
      console.log("Response structure:");
      console.log(JSON.stringify(result, null, 2));
      
      // Verify response has expected fields for modal
      const hasRequiredFields = 
        result.type === 'recurring_slot' &&
        result.slot &&
        result.slot.dayOfWeek !== undefined &&
        result.slot.startTime &&
        result.lessons &&
        Array.isArray(result.lessons) &&
        result.lessons.length > 0;
      
      if (hasRequiredFields) {
        console.log(`✅ Response has all required fields for modal display`);
        console.log(`   - Slot created for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][result.slot.dayOfWeek]} at ${result.slot.startTime}`);
        console.log(`   - ${result.lessons.length} initial lessons created`);
      } else {
        console.log("⚠️  Response missing some fields for modal");
      }
    } else {
      console.error("❌ Booking failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error during booking:", error.message);
  }

  console.log("\n✨ Test complete! Check the browser for the modal display.");
};

// Instructions for running the test
console.log(`
=================================
📋 BOOKING MODAL TEST INSTRUCTIONS
=================================

1. First, log in as a student:
   - Email: student@guitarstrategies.com
   - Password: student123

2. Then run this test in the browser console:
   - Open http://localhost:3002
   - Open browser console (F12)
   - Copy and paste this entire script
   - The test will run automatically

3. After the test:
   - Navigate to the booking page to see the modal
   - Or check the API responses logged here

Note: This test creates real bookings in your database.
Clean them up after testing if needed.
`);

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  testBookingModal();
}