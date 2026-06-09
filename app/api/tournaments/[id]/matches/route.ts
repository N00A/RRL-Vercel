import { NextRequest, NextResponse } from "next/server";
import { listMatches, createMatch, updateMatch, deleteMatch } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const matches = listMatches(params.id);
  return NextResponse.json(matches);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const match = createMatch(params.id, body);
  return NextResponse.json(match, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const match = updateMatch(id, data);
  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(match);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const ok = deleteMatch(body.id);
  if (!ok)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
