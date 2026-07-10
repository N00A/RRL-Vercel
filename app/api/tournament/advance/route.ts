import { NextRequest, NextResponse } from "next/server";
import { readTournament, writeTournament } from "@/lib/tournament-storage";
import { calculateGroupRanking, rankBestThirds } from "@/lib/tournament-scoring";
import type { BestThird, EliminationRoom, Bracket } from "@/types/tournament";

function buildR16Rooms(
  winners: { playerId: string; groupId: string }[],
  runnersUp: { playerId: string; groupId: string }[],
  qualifiedThirds: { playerId: string; groupId: string }[],
  reservedRunnerThirds: { runnerGroup: string; thirdGroup: string }[] = []
): EliminationRoom[] {
  const winnerMap = new Map(winners.map(w => [w.groupId, w]));
  const runnerMap = new Map(runnersUp.map(r => [r.groupId, r]));
  const thirdByGroup = new Map(qualifiedThirds.map(t => [t.groupId, t]));

  const reservedThirdGroups = new Set(reservedRunnerThirds.map(r => r.thirdGroup));
  const reservedRunnerGroups = new Set(reservedRunnerThirds.map(r => r.runnerGroup));
  const availableThirds = qualifiedThirds.filter(t => !reservedThirdGroups.has(t.groupId));

  // Which winners ideally face thirds, with FIFA group constraints
  const idealThirdWinners: { group: string; allowed: string[] }[] = [
    { group: 'A', allowed: ['C', 'D', 'E'] },
    { group: 'B', allowed: ['A', 'C', 'D'] },
    { group: 'C', allowed: ['F', 'G', 'H'] },
    { group: 'E', allowed: ['A', 'B', 'C'] },
    { group: 'F', allowed: ['C', 'E', 'G'] },
    { group: 'H', allowed: ['I', 'J', 'K'] },
    { group: 'I', allowed: ['G', 'H', 'J'] },
    { group: 'J', allowed: ['H', 'I', 'K'] },
  ];

  // Runner-up assignments (winner vs runner for D, G, K, L — plus swapped winners)
  const runnerUpAssignments: { winnerGroup: string; runnerGroup: string }[] = [
    { winnerGroup: 'D', runnerGroup: 'B' },
    { winnerGroup: 'G', runnerGroup: 'A' },
    { winnerGroup: 'K', runnerGroup: 'C' },
    { winnerGroup: 'L', runnerGroup: 'E' },
  ];

  // Step 1: greedily assign best-ranked eligible third to each ideal winner
  const usedThirds = new Set<string>();
  const thirdForWinner = new Map<string, string>();
  const failedWinners: string[] = [];
  let remainingThirds = [...availableThirds];

  for (const { group, allowed } of idealThirdWinners) {
    const idx = remainingThirds.findIndex(
      t => allowed.includes(t.groupId) && !usedThirds.has(t.playerId)
    );
    if (idx !== -1) {
      const pick = remainingThirds.splice(idx, 1)[0];
      thirdForWinner.set(group, pick.playerId);
      usedThirds.add(pick.playerId);
    } else {
      failedWinners.push(group);
    }
  }

  // Step 2: swap failed winners with runner-up-facing winners if there are spare thirds
  for (const failedW of [...failedWinners]) {
    if (remainingThirds.length === 0 || runnerUpAssignments.length === 0) break;
    const swap = runnerUpAssignments.shift()!;
    const third = remainingThirds.shift()!;
    thirdForWinner.set(swap.winnerGroup, third.playerId);
    usedThirds.add(third.playerId);
    // failed winner takes over the runner-up matchup
    runnerUpAssignments.push({ winnerGroup: failedW, runnerGroup: swap.runnerGroup });
    // remove from failed list
    const fi = failedWinners.indexOf(failedW);
    if (fi !== -1) failedWinners.splice(fi, 1);
  }

  // Step 3: remaining failed winners become runner-up-facing
  const usedRunnerGroups = new Set(runnerUpAssignments.map(ru => ru.runnerGroup));
  reservedRunnerGroups.forEach(g => usedRunnerGroups.add(g));
  const freeRunnerGroups = runnersUp.map(r => r.groupId).filter(g => !usedRunnerGroups.has(g));

  for (const failedW of failedWinners) {
    if (freeRunnerGroups.length === 0) break;
    const rg = freeRunnerGroups.shift()!;
    runnerUpAssignments.push({ winnerGroup: failedW, runnerGroup: rg });
  }

  // Step 4: remaining free runners form runner vs runner matchups
  const allUsedRunners = new Set(runnerUpAssignments.map(ru => ru.runnerGroup));
  reservedRunnerGroups.forEach(g => allUsedRunners.add(g));
  const leftoverRunners = runnersUp.map(r => r.groupId).filter(g => !allUsedRunners.has(g));
  const runnerRunnerMatchups: { p1Group: string; p2Group: string }[] = [];
  for (let i = 0; i < leftoverRunners.length - 1; i += 2) {
    runnerRunnerMatchups.push({ p1Group: leftoverRunners[i], p2Group: leftoverRunners[i + 1] });
  }

  // Step 5: build all 16 brackets
  const allBrackets: Bracket[] = [];

  for (const wGroup of thirdForWinner.keys()) {
    const winner = winnerMap.get(wGroup)!;
    const thirdId = thirdForWinner.get(wGroup)!;
    allBrackets.push({ bracketId: "", player1Id: winner.playerId, player2Id: thirdId });
  }

  for (const rt of reservedRunnerThirds) {
    const runner = runnerMap.get(rt.runnerGroup)!;
    const third = thirdByGroup.get(rt.thirdGroup)!;
    allBrackets.push({ bracketId: "", player1Id: runner.playerId, player2Id: third.playerId });
  }

  for (const ru of runnerUpAssignments) {
    const p1 = winnerMap.get(ru.winnerGroup)!;
    const p2 = runnerMap.get(ru.runnerGroup)!;
    allBrackets.push({ bracketId: "", player1Id: p1.playerId, player2Id: p2.playerId });
  }

  for (const rr of runnerRunnerMatchups) {
    const p1 = runnerMap.get(rr.p1Group)!;
    const p2 = runnerMap.get(rr.p2Group)!;
    allBrackets.push({ bracketId: "", player1Id: p1.playerId, player2Id: p2.playerId });
  }

  // Step 6: distribute into 8 salas (2 brackets each)
  const rooms: EliminationRoom[] = [];
  for (let i = 0; i < 8; i++) {
    const bA = allBrackets[i * 2] ?? { bracketId: "A", player1Id: "", player2Id: "" };
    const bB = allBrackets[i * 2 + 1] ?? { bracketId: "B", player1Id: "", player2Id: "" };
    bA.bracketId = "A";
    bB.bracketId = "B";
    rooms.push({
      roomId: `R16_SALA${i + 1}`,
      phase: "R16",
      brackets: [bA, bB],
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
          qualifiedThirds,
          [
            { runnerGroup: 'I', thirdGroup: 'G' }, // Noruega vs Belgica
            { runnerGroup: 'G', thirdGroup: 'C' }, // Iran vs Brasil
          ]
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
