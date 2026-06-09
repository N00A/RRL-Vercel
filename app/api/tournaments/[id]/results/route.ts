import { NextRequest, NextResponse } from "next/server";
import { listRaceResults, createRaceResult } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const results = listRaceResults(params.id);
  return NextResponse.json(results);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const result = createRaceResult(params.id, body);
  return NextResponse.json(result, { status: 201 });
}
