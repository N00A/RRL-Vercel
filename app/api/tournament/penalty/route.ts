import { NextRequest, NextResponse } from "next/server";
import { readTournament, writeTournament } from "@/lib/tournament-storage";
import { applyRepickPenalty } from "@/lib/tournament-scoring";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerId, phase, groupId, roomId } = body;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      );
    }

    if (phase !== "GROUPS" && phase !== "ELIMINATION") {
      return NextResponse.json(
        { error: "phase must be 'GROUPS' or 'ELIMINATION'" },
        { status: 400 }
      );
    }

    if (phase === "GROUPS" && (!groupId || typeof groupId !== "string")) {
      return NextResponse.json(
        { error: "groupId is required when phase is GROUPS" },
        { status: 400 }
      );
    }

    if (phase === "ELIMINATION" && (!roomId || typeof roomId !== "string")) {
      return NextResponse.json(
        { error: "roomId is required when phase is ELIMINATION" },
        { status: 400 }
      );
    }

    const state = await readTournament();

    const context =
      phase === "GROUPS"
        ? { phase: "GROUPS" as const, groupId: groupId! }
        : { phase: "ELIMINATION" as const, roomId: roomId! };

    const newState = applyRepickPenalty(state, playerId, context);

    if (phase === "GROUPS") {
      const group = newState.groups.find((g) => g.groupId === groupId);
      if (!group) {
        return NextResponse.json(
          { error: `Group ${groupId} not found` },
          { status: 400 }
        );
      }
      const playerInGroup = group.players.some((p) => p.id === playerId);
      if (!playerInGroup) {
        return NextResponse.json(
          { error: `Player ${playerId} not found in group ${groupId}` },
          { status: 400 }
        );
      }
    }

    if (phase === "ELIMINATION") {
      const room = newState.eliminationRooms.find(
        (r) => r.roomId === roomId
      );
      if (!room) {
        return NextResponse.json(
          { error: `Room ${roomId} not found` },
          { status: 400 }
        );
      }
    }

    await writeTournament(newState);
    return NextResponse.json({ applied: true, playerId, amount: -7 });
  } catch {
    return NextResponse.json(
      { error: "Failed to apply penalty" },
      { status: 500 }
    );
  }
}
