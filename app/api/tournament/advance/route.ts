import { NextRequest, NextResponse } from "next/server";
import { readTournament, writeTournament } from "@/lib/tournament-storage";
import { calculateGroupRanking, rankBestThirds } from "@/lib/tournament-scoring";
import type { BestThird, EliminationRoom, Bracket } from "@/types/tournament";

function buildR16Rooms(
  winners: { playerId: string; groupId: string }[],
  runnersUp: { playerId: string; groupId: string }[],
  qualifiedThirds: { playerId: string; groupId: string }[]
): EliminationRoom[] {
  const rooms: EliminationRoom[] = [];

  const pot1 = winners.slice(0, 8);
  const pot2 = [
    ...winners.slice(8),
    ...runnersUp.slice(0, 4),
  ];
  const pot3 = runnersUp.slice(4);
  const pot4 = qualifiedThirds;

  for (let i = 0; i < 8; i++) {
    const p1 = pot1[i].playerId;
    const p2 = pot2[i].playerId;
    const p3 = pot3[i].playerId;
    const p4 = pot4[i].playerId;

    rooms.push({
      roomId: `R16_SALA${i + 1}`,
      phase: "R16",
      brackets: [
        { bracketId: "A", player1Id: p1, player2Id: p2 },
        { bracketId: "B", player1Id: p3, player2Id: p4 },
      ],
      completed: false,
    });
  }

  return rooms;
}

function buildNextPhase(
  prevRooms: EliminationRoom[],
  phase: "QF" | "SF" | "F"
): EliminationRoom[] {
  const phasePrefix =
    phase === "QF" ? "QF" : phase === "SF" ? "SF" : "F";
  const playerCount = phase === "QF" ? 4 : phase === "SF" ? 2 : 1;
  const roomsCount = prevRooms.length / 2;

  const allWinners: string[] = [];
  for (const room of prevRooms) {
    const bracketWinners = room.brackets
      .map((b) => b.winnerId)
      .filter((w): w is string => !!w);
    allWinners.push(...bracketWinners);
  }

  const rooms: EliminationRoom[] = [];
  for (let i = 0; i < roomsCount; i++) {
    const start = i * playerCount * 2;
    const roomPlayers = allWinners.slice(start, start + playerCount * 2);

    const brackets: [Bracket, Bracket] = [
      {
        bracketId: "A",
        player1Id: roomPlayers[0],
        player2Id: roomPlayers[1],
      },
      {
        bracketId: "B",
        player1Id: roomPlayers[2],
        player2Id: roomPlayers[3],
      },
    ];

    rooms.push({
      roomId: `${phasePrefix}_SALA${i + 1}`,
      phase,
      brackets,
      completed: false,
    });
  }

  return rooms;
}

export async function POST(_req: NextRequest) {
  try {
    const state = await readTournament();

    switch (state.phase) {
      case "GROUPS": {
        const allClosed = state.groups.every((g) => g.finalRanking);
        if (!allClosed) {
          return NextResponse.json(
            { error: "All groups must be closed before advancing" },
            { status: 400 }
          );
        }

        const groupWinners: { playerId: string; groupId: string }[] = [];
        const runnersUp: { playerId: string; groupId: string }[] = [];
        const allThirds: BestThird[] = [];

        for (const group of state.groups) {
          const ranking = group.finalRanking!;
          const winner = ranking.find((r) => r.position === 1)!;
          groupWinners.push({
            playerId: winner.playerId,
            groupId: group.groupId,
          });

          const runnerUp = ranking.find((r) => r.position === 2)!;
          runnersUp.push({
            playerId: runnerUp.playerId,
            groupId: group.groupId,
          });

          const third = ranking.find((r) => r.position === 3)!;
          const player = group.players.find(
            (p) => p.id === third.playerId
          )!;
          allThirds.push({
            playerId: third.playerId,
            groupId: group.groupId,
            groupPoints: third.groupPoints,
            totalMkPoints: third.totalMkPoints,
            botCount: player.botCount,
          });
        }

        const rankedThirds = rankBestThirds(allThirds);
        const qualifiedThirds = rankedThirds
          .filter((t) => t.rankPosition! <= 8)
          .map((t) => ({
            playerId: t.playerId,
            groupId: t.groupId,
          }));

        state.bestThirds = rankedThirds;
        state.eliminationRooms = buildR16Rooms(
          groupWinners,
          runnersUp,
          qualifiedThirds
        );
        state.phase = "R16";
        break;
      }

      case "R16": {
        const allDone = state.eliminationRooms.every(
          (r) => r.phase === "R16" && r.completed
        );
        if (!allDone) {
          return NextResponse.json(
            { error: "All R16 rooms must be completed before advancing" },
            { status: 400 }
          );
        }
        const r16Rooms = state.eliminationRooms.filter(
          (r) => r.phase === "R16"
        );
        const qfRooms = buildNextPhase(r16Rooms, "QF");
        state.eliminationRooms.push(...qfRooms);
        state.phase = "QF";
        break;
      }

      case "QF": {
        const allDone = state.eliminationRooms.every(
          (r) => r.phase === "QF" && r.completed
        );
        if (!allDone) {
          return NextResponse.json(
            { error: "All QF rooms must be completed before advancing" },
            { status: 400 }
          );
        }
        const qfRooms = state.eliminationRooms.filter(
          (r) => r.phase === "QF"
        );
        const sfRooms = buildNextPhase(qfRooms, "SF");
        state.eliminationRooms.push(...sfRooms);
        state.phase = "SF";
        break;
      }

      case "SF": {
        const allDone = state.eliminationRooms.every(
          (r) => r.phase === "SF" && r.completed
        );
        if (!allDone) {
          return NextResponse.json(
            { error: "All SF rooms must be completed before advancing" },
            { status: 400 }
          );
        }
        const sfRooms = state.eliminationRooms.filter(
          (r) => r.phase === "SF"
        );
        const finalRooms = buildNextPhase(sfRooms, "F");
        state.eliminationRooms.push(...finalRooms);
        state.phase = "F";
        break;
      }

      case "F": {
        return NextResponse.json(
          { error: "Tournament is already in the final phase" },
          { status: 400 }
        );
      }

      case "DONE": {
        return NextResponse.json(
          { error: "Tournament is already completed" },
          { status: 400 }
        );
      }
    }

    await writeTournament(state);
    return NextResponse.json({
      phase: state.phase,
      eliminationRooms: state.eliminationRooms.filter(
        (r) => !r.completed
      ).length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to advance tournament" },
      { status: 500 }
    );
  }
}
