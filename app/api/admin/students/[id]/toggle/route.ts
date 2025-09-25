import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAdminValidation } from '@/lib/api-wrapper';
import { toggleStatusSchema } from '@/lib/validations';
import {
  createSuccessResponse,
  handleApiError
} from '@/lib/api-responses';
import { getValidatedBody } from '@/lib/validated-request';

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const validatedData = getValidatedBody(request, toggleStatusSchema);

    if (!validatedData) {
      throw new Error('Invalid request body');
    }

    const { isActive } = validatedData;

    // Update student profile active status
    await prisma.studentProfile.update({
      where: {
        userId: params.id,
      },
      data: {
        isActive,
      },
    });

    return createSuccessResponse(
      { isActive },
      'Student status updated successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Export with validation middleware
export const POST = withAdminValidation(handlePOST, toggleStatusSchema);