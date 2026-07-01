import { NextRequest, NextResponse } from "next/server";
import { readTournament, writeTournament } from "@/lib/tournament-storage";

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

    const body = await req.json();
    const { raceNumber, positions, trackId } = body;

    if (typeof raceNumber !== "number" || raceNumber < 1 || raceNumber > 12) {
      return NextResponse.json(
        { error: "raceNumber must be between 1 and 12" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(positions) ||
      positions.length !== 4
    ) {
      return NextResponse.json(
        { error: "positions must be an array of 4 entries" },
        { status: 400 }
      );
    }

    const raceExists = group.races.some((r) => r.raceNumber === raceNumber);
    if (raceExists) {
      return NextResponse.json(
        { error: `Race ${raceNumber} already registered for group ${params.groupId}` },
        { status: 400 }
      );
    }

    if (trackId) {
      const trackExists = group.races.some((r) => r.trackId === trackId);
      if (trackExists) {
        return NextResponse.json(
          { error: `Track ${trackId} already played in this group` },
          { status: 400 }
        );
      }
    }

    const groupPlayerIds = new Set(group.players.map((p) => p.id));
    for (const pos of positions) {
      if (!groupPlayerIds.has(pos.playerId)) {
        return NextResponse.json(
          {
            error: `Player ${pos.playerId} does not belong to group ${params.groupId}`,
          },
          { status: 400 }
        );
      }
      if (typeof pos.position !== "number" || pos.position < 1 || pos.position > 4) {
        return NextResponse.json(
          { error: "position must be between 1 and 4" },
          { status: 400 }
        );
      }
      if (typeof pos.mkPoints !== "number") {
        return NextResponse.json(
          { error: "mkPoints is required" },
          { status: 400 }
        );
      }
    }

    const positionPlayerIds = new Set(positions.map((p: { playerId: string }) => p.playerId));
    if (positionPlayerIds.size !== 4) {
      return NextResponse.json(
        { error: "All 4 positions must have different playerIds" },
        { status: 400 }
      );
    }

    group.races.push({
      raceNumber,
      trackId,
      positions,
    });

    await writeTournament(state);
    return NextResponse.json(group, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to register race" },
      { status: 500 }
    );
  }
}
