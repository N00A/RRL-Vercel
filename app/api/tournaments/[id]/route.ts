import { NextRequest, NextResponse } from "next/server";
import {
  getTournament,
  updateTournament,
  deleteTournament,
} from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tournament = getTournament(params.id);
  if (!tournament)
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  return NextResponse.json(tournament);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const tournament = updateTournament(params.id, body);
  if (!tournament)
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  return NextResponse.json(tournament);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = deleteTournament(params.id);
  if (!ok)
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  return NextResponse.json({ success: true });
}
