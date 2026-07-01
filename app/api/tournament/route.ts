import { NextResponse } from "next/server";
import { readTournament } from "@/lib/tournament-storage";

export async function GET() {
  try {
    const state = await readTournament();
    return NextResponse.json(state);
  } catch {
    return NextResponse.json(
      { error: "Failed to read tournament state" },
      { status: 500 }
    );
  }
}
