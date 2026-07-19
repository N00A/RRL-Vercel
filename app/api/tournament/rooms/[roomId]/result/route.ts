import { NextRequest, NextResponse } from "next/server";
import { readTournament, writeTournament } from "@/lib/tournament-storage";
import { resolveRoom } from "@/lib/tournament-scoring";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const state = await readTournament();
    const room = state.eliminationRooms.find(
      (r) => r.roomId === params.roomId
    );

    if (!room) {
      return NextResponse.json(
        { error: `Room ${params.roomId} not found` },
        { status: 400 }
      );
    }

    if (room.completed) {
      return NextResponse.json(
        { error: `Room ${params.roomId} is already completed` },
        { status: 400 }
      );
    }

    const phaseMap: Record<string, string> = {
      R16: "R16",
      QF: "QF",
      SF: "SF",
      F: "F",
    };
    const expectedPhase = phaseMap[room.phase];
    if (state.phase !== expectedPhase) {
      return NextResponse.json(
        {
          error: `Room phase ${room.phase} does not match tournament phase ${state.phase}`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { positions } = body;

    if (
      !Array.isArray(positions) ||
      positions.length !== 4
    ) {
      return NextResponse.json(
        { error: "positions must be an array of 4 entries" },
        { status: 400 }
      );
    }

    const roomPlayerIds = new Set<string>();
    if (room.freeForAll && room.participants) {
      for (const pid of room.participants) {
        roomPlayerIds.add(pid);
      }
    } else {
      for (const bracket of room.brackets) {
        roomPlayerIds.add(bracket.player1Id);
        roomPlayerIds.add(bracket.player2Id);
      }
    }

    const seen = new Set<string>();
    for (const pos of positions) {
      if (typeof pos.position !== "number" || pos.position < 1 || pos.position > 4) {
        return NextResponse.json(
          { error: "position must be between 1 and 4" },
          { status: 400 }
        );
      }
      if (!roomPlayerIds.has(pos.playerId)) {
        return NextResponse.json(
          { error: `Player ${pos.playerId} is not in this room` },
          { status: 400 }
        );
      }
      if (seen.has(pos.playerId)) {
        return NextResponse.json(
          { error: `Duplicate playerId ${pos.playerId} in positions` },
          { status: 400 }
        );
      }
      seen.add(pos.playerId);
    }

    if (seen.size !== 4) {
      return NextResponse.json(
        { error: "All 4 players must have a position" },
        { status: 400 }
      );
    }

    room.racePositions = positions;

    const result = resolveRoom(room);

    for (const bracket of room.brackets) {
      const winner = result.winners.find(
        (w) =>
          w === bracket.player1Id || w === bracket.player2Id
      );
      if (winner) {
        bracket.winnerId = winner;
      }
    }

    room.completed = true;

    if (room.phase === "F" && result.podium) {
      state.podium = result.podium;
      state.phase = "DONE";
    }

    await writeTournament(state);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to register room result";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
