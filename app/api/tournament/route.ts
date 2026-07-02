import { NextResponse } from "next/server";
import { readTournament } from "@/lib/tournament-storage";
import { computeTopScorers } from "@/lib/tournament-scoring";

export async function GET() {
  try {
    const state = await readTournament();
    const topScorers = computeTopScorers(state);
    return NextResponse.json({ ...state, topScorers });
  } catch {
    return NextResponse.json(
      { error: "Failed to read tournament state" },
      { status: 500 }
    );
  }
}
