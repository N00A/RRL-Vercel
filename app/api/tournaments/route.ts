import { NextRequest, NextResponse } from "next/server";
import { listTournaments, createTournament } from "@/lib/storage";

export async function GET() {
  const tournaments = listTournaments();
  return NextResponse.json(tournaments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tournament = createTournament(body);
  return NextResponse.json(tournament, { status: 201 });
}
