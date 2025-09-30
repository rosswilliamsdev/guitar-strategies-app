import { NextRequest, NextResponse } from "next/server";

// Curriculum feature is not implemented in the current schema
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Curriculum feature not implemented' },
    { status: 501 }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Curriculum feature not implemented' },
    { status: 501 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Curriculum feature not implemented' },
    { status: 501 }
  );
}