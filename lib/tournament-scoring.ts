import type {
  GroupStage,
  GroupRanking,
  BestThird,
  EliminationRoom,
  TournamentState,
  Bracket,
} from "@/types/tournament";

const GROUP_POINTS: Record<number, number> = {
  1: 9,
  2: 6,
  3: 3,
  4: 0,
};

const MK_POINTS: Record<number, number> = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
  5: 7,
  6: 6,
  7: 5,
  8: 4,
  9: 3,
  10: 2,
  11: 1,
  12: 0,
};

export function calculateGroupRanking(stage: GroupStage): GroupRanking[] {
  const validRaces = stage.validRaces ?? stage.races.length;
  const racesToCount = stage.races.filter((r) => r.raceNumber <= validRaces);

  const totals = new Map<string, number>();
  for (const player of stage.players) {
    totals.set(player.id, 0);
  }

  for (const race of racesToCount) {
    for (const pos of race.positions) {
      if (pos.lateEntry) continue;
      const current = totals.get(pos.playerId) ?? 0;
      totals.set(pos.playerId, current + pos.mkPoints);
    }
  }

  const penalties = stage.penalties ?? [];
  for (const p of penalties) {
    const current = totals.get(p.playerId) ?? 0;
    totals.set(p.playerId, current + p.amount);
  }

  const sorted = stage.players
    .map((p) => ({
      playerId: p.id,
      totalMkPoints: totals.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.totalMkPoints - a.totalMkPoints);

  return sorted.map((entry, idx) => ({
    playerId: entry.playerId,
    position: (idx + 1) as 1 | 2 | 3 | 4,
    totalMkPoints: entry.totalMkPoints,
    groupPoints: GROUP_POINTS[idx + 1] ?? 0,
  }));
}

export function rankBestThirds(thirds: BestThird[]): BestThird[] {
  const sorted = [...thirds].sort((a, b) => {
    if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
    if (b.totalMkPoints !== a.totalMkPoints)
      return b.totalMkPoints - a.totalMkPoints;
    return a.botCount - b.botCount;
  });

  return sorted.map((entry, idx) => ({
    ...entry,
    rankPosition: idx + 1,
  }));
}

export function resolveRoom(room: EliminationRoom): {
  winners: string[]
  eliminated: string[]
  podium?: { first: string; second: string; third: string }
} {
  if (!room.racePositions || room.racePositions.length === 0) {
    throw new Error("Room has no race positions");
  }

  const posMap = new Map<string, number>();
  for (const rp of room.racePositions) {
    posMap.set(rp.playerId, rp.position);
  }

  const sortedByPosition = [...room.racePositions].sort(
    (a, b) => a.position - b.position
  );

  if (room.freeForAll) {
    return {
      winners: sortedByPosition.map((p) => p.playerId),
      eliminated: [],
      podium:
        sortedByPosition.length >= 3
          ? {
              first: sortedByPosition[0].playerId,
              second: sortedByPosition[1].playerId,
              third: sortedByPosition[2].playerId,
            }
          : undefined,
    };
  }

  const resolveBracket = (b: Bracket): string | null => {
    const pos1 = posMap.get(b.player1Id);
    const pos2 = posMap.get(b.player2Id);
    if (pos1 === undefined || pos2 === undefined) return null;
    if (pos1 === pos2) return null;
    return pos1 < pos2 ? b.player1Id : b.player2Id;
  };

  const winners: string[] = [];
  const eliminated: string[] = [];

  for (const bracket of room.brackets) {
    const winner = resolveBracket(bracket);
    if (winner) {
      winners.push(winner);
      const loser =
        winner === bracket.player1Id ? bracket.player2Id : bracket.player1Id;
      eliminated.push(loser);
    }
  }

  let podium: { first: string; second: string; third: string } | undefined;
  if (room.phase === "F" && sortedByPosition.length >= 3) {
    podium = {
      first: sortedByPosition[0].playerId,
      second: sortedByPosition[1].playerId,
      third: sortedByPosition[2].playerId,
    };
  }

  return { winners, eliminated, podium };
}

export function computeTopScorers(state: TournamentState): { playerId: string; totalMkPoints: number }[] {
  const totals = new Map<string, number>();

  for (const group of state.groups) {
    if (group.finalRanking && group.races.length === 0) {
      for (const r of group.finalRanking) {
        const current = totals.get(r.playerId) ?? 0;
        totals.set(r.playerId, current + r.totalMkPoints);
      }
    }
    for (const race of group.races) {
      for (const pos of race.positions) {
        if (pos.lateEntry) continue;
        const current = totals.get(pos.playerId) ?? 0;
        totals.set(pos.playerId, current + pos.mkPoints);
      }
    }
    const penalties = group.penalties ?? [];
    for (const p of penalties) {
      const current = totals.get(p.playerId) ?? 0;
      totals.set(p.playerId, current + p.amount);
    }
  }

  for (const room of state.eliminationRooms) {
    if (room.racePositions) {
      for (const rp of room.racePositions) {
        if (rp.mkPoints) {
          const current = totals.get(rp.playerId) ?? 0;
          totals.set(rp.playerId, current + rp.mkPoints);
        }
      }
    }
    const penalties = room.penalties ?? [];
    for (const p of penalties) {
      const current = totals.get(p.playerId) ?? 0;
      totals.set(p.playerId, current + p.amount);
    }
  }

  return [...totals.entries()]
    .map(([playerId, totalMkPoints]) => ({ playerId, totalMkPoints }))
    .sort((a, b) => b.totalMkPoints - a.totalMkPoints);
}

export function applyRepickPenalty(
  state: TournamentState,
  playerId: string,
  context:
    | { phase: "GROUPS"; groupId: string }
    | { phase: "ELIMINATION"; roomId: string }
): TournamentState {
  const newState: TournamentState = JSON.parse(JSON.stringify(state));

  if (context.phase === "GROUPS") {
    const group = newState.groups.find((g) => g.groupId === context.groupId);
    if (!group) return newState;
    if (!group.penalties) group.penalties = [];
    group.penalties.push({
      playerId,
      amount: -7,
      reason: "repick",
      raceNumber: group.races.length,
    });
  } else {
    const room = newState.eliminationRooms.find(
      (r) => r.roomId === context.roomId
    );
    if (!room) return newState;
    if (!room.penalties) room.penalties = [];
    room.penalties.push({
      playerId,
      amount: -7,
      reason: "repick",
    });
  }

  return newState;
}
