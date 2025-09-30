import { NextRequest, NextResponse } from "next/server";

// Curriculum feature is not implemented in the current schema
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Curriculum feature not implemented' },
    { status: 501 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Curriculum feature not implemented' },
    { status: 501 }
  );
}