import { NextRequest, NextResponse } from "next/server";
import { readTournament, writeTournament } from "@/lib/tournament-storage";

const GROUP_POINTS: Record<number, number> = { 1: 9, 2: 6, 3: 3, 4: 0 };

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const state = await readTournament();

    if (state.phase !== "GROUPS") {
      return NextResponse.json(
        { error: "Tournament is not in group phase" },
        { status: 400 }
      );
    }

    const group = state.groups.find((g) => g.groupId === params.groupId);
    if (!group) {
      return NextResponse.json(
        { error: `Group ${params.groupId} not found` },
        { status: 400 }
      );
    }

    if (group.finalRanking) {
      return NextResponse.json(
        { error: `Group ${params.groupId} is already closed` },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { results } = body;

    if (!results || !Array.isArray(results) || results.length !== 4) {
      return NextResponse.json(
        { error: "results must be an array of 4 entries with playerId and totalMkPoints" },
        { status: 400 }
      );
    }

    const groupPlayerIds = new Set(group.players.map((p) => p.id));
    for (const r of results) {
      if (!groupPlayerIds.has(r.playerId)) {
        return NextResponse.json(
          { error: `Player ${r.playerId} does not belong to group ${params.groupId}` },
          { status: 400 }
        );
      }
      if (typeof r.totalMkPoints !== "number") {
        return NextResponse.json(
          { error: "totalMkPoints is required for each player" },
          { status: 400 }
        );
      }
    }

    const sorted = [...results].sort((a, b) => b.totalMkPoints - a.totalMkPoints);

    group.finalRanking = sorted.map((entry, idx) => ({
      playerId: entry.playerId,
      position: (idx + 1) as 1 | 2 | 3 | 4,
      totalMkPoints: entry.totalMkPoints,
      groupPoints: GROUP_POINTS[idx + 1] ?? 0,
    }));

    await writeTournament(state);
    return NextResponse.json(group.finalRanking, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to close group" },
      { status: 500 }
    );
  }
}
