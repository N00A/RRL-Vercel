"use client";

import { useState, useEffect, useMemo } from "react";
import type { TournamentState, GroupStage, EliminationRoom, BestThird } from "@/types/tournament";

type TopScorer = { playerId: string; totalMkPoints: number };

type BracketPairing = {
  roomId: string;
  bracketA: { player1Id: string; player1Name: string; player2Id: string; player2Name: string };
  bracketB: { player1Id: string; player1Name: string; player2Id: string; player2Name: string };
};

const PHASE_LABELS: Record<string, string> = {
  GROUPS: "Fase de Grupos",
  R16: "Dieciseisavos",
  QF: "Cuartos de Final",
  SF: "Semifinales",
  F: "Gran Final",
  DONE: "Finalizado",
};

const PHASE_COLORS: Record<string, string> = {
  GROUPS: "bg-blue-500/20 text-blue-400",
  R16: "bg-purple-500/20 text-purple-400",
  QF: "bg-pink-500/20 text-pink-400",
  SF: "bg-orange-500/20 text-orange-400",
  F: "bg-rojo/20 text-rojo",
  DONE: "bg-verde/20 text-verde",
};

function playerName(p: { name: string } | undefined, fallback: string): string {
  return p ? p.name.replace(" (BOT)", "") : fallback;
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }) + " — " + d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}

function rankBestThirdsClient(thirds: BestThird[]): BestThird[] {
  const sorted = [...thirds].sort((a, b) => {
    if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
    if (b.totalMkPoints !== a.totalMkPoints) return b.totalMkPoints - a.totalMkPoints;
    return a.botCount - b.botCount;
  });
  return sorted.map((entry, idx) => ({ ...entry, rankPosition: idx + 1 }));
}

function computeR16Pairings(state: TournamentState): BracketPairing[] {
  const groupWinners: { playerId: string; groupId: string }[] = [];
  const runnersUp: { playerId: string; groupId: string }[] = [];
  const allThirds: BestThird[] = [];

  for (const group of state.groups) {
    if (group.finalRanking) {
      const ranking = group.finalRanking;
      const winner = ranking.find(r => r.position === 1)!;
      groupWinners.push({ playerId: winner.playerId, groupId: group.groupId });
      const runnerUp = ranking.find(r => r.position === 2)!;
      runnersUp.push({ playerId: runnerUp.playerId, groupId: group.groupId });
      const third = ranking.find(r => r.position === 3)!;
      const player = group.players.find(p => p.id === third.playerId)!;
      allThirds.push({
        playerId: third.playerId,
        groupId: group.groupId,
        groupPoints: third.groupPoints,
        totalMkPoints: third.totalMkPoints,
        botCount: player.botCount,
      });
    } else {
      groupWinners.push({ playerId: "", groupId: group.groupId });
      runnersUp.push({ playerId: "", groupId: group.groupId });
    }
  }

  const rankedThirds = rankBestThirdsClient(allThirds);
  const qualifiedThirds = rankedThirds.filter(t => t.rankPosition! <= 8);

  const winnerMap = new Map(groupWinners.map(w => [w.groupId, w]));
  const runnerMap = new Map(runnersUp.map(r => [r.groupId, r]));
  const thirdByGroup = new Map(qualifiedThirds.map(t => [t.groupId, t]));

  const reservedRunnerThirds: { runnerGroup: string; thirdGroup: string }[] = [
    { runnerGroup: 'I', thirdGroup: 'G' },
    { runnerGroup: 'G', thirdGroup: 'C' },
  ];

  const reservedThirdGroups = new Set(reservedRunnerThirds.map(r => r.thirdGroup));
  const reservedRunnerGroups = new Set(reservedRunnerThirds.map(r => r.runnerGroup));
  const availableThirds = qualifiedThirds.filter(t => !reservedThirdGroups.has(t.groupId));
  const allRunnerGroupIds = runnersUp.map(r => r.groupId);

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

  const runnerUpAssignments: { winnerGroup: string; runnerGroup: string }[] = [
    { winnerGroup: 'D', runnerGroup: 'B' },
    { winnerGroup: 'G', runnerGroup: 'A' },
    { winnerGroup: 'K', runnerGroup: 'C' },
    { winnerGroup: 'L', runnerGroup: 'E' },
  ];

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

  for (const failedW of [...failedWinners]) {
    if (remainingThirds.length === 0 || runnerUpAssignments.length === 0) break;
    const swap = runnerUpAssignments.shift()!;
    const third = remainingThirds.shift()!;
    thirdForWinner.set(swap.winnerGroup, third.playerId);
    usedThirds.add(third.playerId);
    runnerUpAssignments.push({ winnerGroup: failedW, runnerGroup: swap.runnerGroup });
    const fi = failedWinners.indexOf(failedW);
    if (fi !== -1) failedWinners.splice(fi, 1);
  }

  const usedRunnerGroups = new Set(runnerUpAssignments.map(ru => ru.runnerGroup));
  reservedRunnerGroups.forEach(g => usedRunnerGroups.add(g));
  const freeRunnerGroups = allRunnerGroupIds.filter(g => !usedRunnerGroups.has(g));

  for (const failedW of failedWinners) {
    if (freeRunnerGroups.length === 0) break;
    const rg = freeRunnerGroups.shift()!;
    runnerUpAssignments.push({ winnerGroup: failedW, runnerGroup: rg });
  }

  const allUsedRunners = new Set(runnerUpAssignments.map(ru => ru.runnerGroup));
  reservedRunnerGroups.forEach(g => allUsedRunners.add(g));
  const leftoverRunners = allRunnerGroupIds.filter(g => !allUsedRunners.has(g));
  const runnerRunnerMatchups: { p1Group: string; p2Group: string }[] = [];
  for (let i = 0; i < leftoverRunners.length - 1; i += 2) {
    runnerRunnerMatchups.push({ p1Group: leftoverRunners[i], p2Group: leftoverRunners[i + 1] });
  }

  const allBrackets: { player1Id: string; player2Id: string }[] = [];

  for (const wGroup of thirdForWinner.keys()) {
    const winner = winnerMap.get(wGroup) ?? { playerId: "", groupId: "" };
    const thirdId = thirdForWinner.get(wGroup) ?? "";
    allBrackets.push({ player1Id: winner.playerId, player2Id: thirdId });
  }

  for (const rt of reservedRunnerThirds) {
    const runner = runnerMap.get(rt.runnerGroup) ?? { playerId: "", groupId: "" };
    const third = thirdByGroup.get(rt.thirdGroup) ?? { playerId: "", groupId: "" };
    allBrackets.push({ player1Id: runner.playerId, player2Id: third.playerId });
  }

  for (const ru of runnerUpAssignments) {
    const p1 = winnerMap.get(ru.winnerGroup) ?? { playerId: "", groupId: "" };
    const p2 = runnerMap.get(ru.runnerGroup) ?? { playerId: "", groupId: "" };
    allBrackets.push({ player1Id: p1.playerId, player2Id: p2.playerId });
  }

  for (const rr of runnerRunnerMatchups) {
    const p1 = runnerMap.get(rr.p1Group) ?? { playerId: "", groupId: "" };
    const p2 = runnerMap.get(rr.p2Group) ?? { playerId: "", groupId: "" };
    allBrackets.push({ player1Id: p1.playerId, player2Id: p2.playerId });
  }

  const rooms: BracketPairing[] = [];
  const allPlayers = state.players;

  for (let i = 0; i < 8; i++) {
    const bA = allBrackets[i * 2] ?? { player1Id: "", player2Id: "" };
    const bB = allBrackets[i * 2 + 1] ?? { player1Id: "", player2Id: "" };

    rooms.push({
      roomId: `R16_SALA${i + 1}`,
      bracketA: {
        player1Id: bA.player1Id,
        player1Name: bA.player1Id ? playerName(allPlayers.find(p => p.id === bA.player1Id), bA.player1Id) : "Por definir",
        player2Id: bA.player2Id,
        player2Name: bA.player2Id ? playerName(allPlayers.find(p => p.id === bA.player2Id), bA.player2Id) : "Por definir",
      },
      bracketB: {
        player1Id: bB.player1Id,
        player1Name: bB.player1Id ? playerName(allPlayers.find(p => p.id === bB.player1Id), bB.player1Id) : "Por definir",
        player2Id: bB.player2Id,
        player2Name: bB.player2Id ? playerName(allPlayers.find(p => p.id === bB.player2Id), bB.player2Id) : "Por definir",
      },
    });
  }

  return rooms;
}

type TabKey = "grupos" | "dieciseisavos" | "octavos" | "cuartos" | "semifinal";

const PHASE_ROOMS: Record<string, { rooms: number; advance: number; phase: string; date: string; dateLabel: string }> = {
  dieciseisavos: { rooms: 8, advance: 16, phase: "R16", date: "2026-07-11", dateLabel: "Sabado 11 de Julio" },
  octavos: { rooms: 4, advance: 8, phase: "QF", date: "2026-07-12", dateLabel: "Domingo 12 de Julio" },
  cuartos: { rooms: 2, advance: 4, phase: "SF", date: "2026-07-18", dateLabel: "Sabado 18 de Julio" },
  semifinal: { rooms: 1, advance: 0, phase: "F", date: "2026-07-19", dateLabel: "Domingo 19 de Julio" },
};

export default function MundialPage() {
  const [state, setState] = useState<TournamentState | null>(null);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [tab, setTab] = useState<TabKey>("grupos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tournament")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar el torneo");
        return r.json();
      })
      .then((data) => {
        setState(data);
        setTopScorers(data.topScorers ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const r16Pairings = useMemo(() => state ? computeR16Pairings(state) : [], [state]);
  const clientBestThirds = useMemo(() => state ? computeAllThirds(state) : [], [state]);
  const rankedClientBestThirds = useMemo(() => rankBestThirdsClient(clientBestThirds), [clientBestThirds]);

  const handleRefresh = () => {
    setLoading(true);
    fetch("/api/tournament")
      .then((r) => r.json())
      .then((data) => {
        setState(data);
        setTopScorers(data.topScorers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (loading) return <div className="text-center py-12 text-white/40">Cargando Mundial 2026...</div>;
  if (error) return <div className="text-center py-12 text-rojo">{error}</div>;
  if (!state) return <div className="text-center py-12 text-white/40">Sin datos</div>;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "grupos", label: "Grupos" },
    { key: "dieciseisavos", label: "16vos" },
    { key: "octavos", label: "8vos" },
    { key: "cuartos", label: "4tos" },
    { key: "semifinal", label: "Semis/Final" },
  ];

  const phaseRooms = (phaseCode: string) =>
    state.eliminationRooms.filter(r => r.phase === phaseCode);

  return (
    <div>
      <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mario Kart Mundial 2026</h1>
            <p className="text-white/60 text-sm mt-1">48 selecciones — 12 grupos de 4</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${PHASE_COLORS[state.phase]}`}>
              {PHASE_LABELS[state.phase]}
            </span>
            <button
              onClick={handleRefresh}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              ↻
            </button>
          </div>
        </div>
        {state.podium && (
          <div className="mt-4 bg-dorado/10 border border-dorado/30 rounded-lg p-4 text-center">
            <p className="text-dorado font-bold text-lg">Podio Final</p>
            <div className="flex justify-center gap-6 mt-2 text-sm">
              <span>1° <span className="text-dorado font-bold">{playerName(state.players.find(p => p.id === state.podium!.first), state.podium.first)}</span></span>
              <span>2° <span className="text-white/80">{playerName(state.players.find(p => p.id === state.podium!.second), state.podium.second)}</span></span>
              <span>3° <span className="text-amber-700">{playerName(state.players.find(p => p.id === state.podium!.third), state.podium.third)}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg shrink-0 ${
              tab === t.key
                ? "bg-navy-light text-white border-b-2 border-rojo"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topScorers.length > 0 && (
        <div className="mb-6">
          <GoleadoresView scorers={topScorers} players={state.players} />
        </div>
      )}

      {tab === "grupos" && (
        <>
          <GroupsView groups={state.groups} />
          {rankedClientBestThirds.length > 0 && <BestThirdsView thirds={rankedClientBestThirds} players={state.players} />}
          <BracketInfo />
          {state.eliminationRooms.length > 0 && <EliminationView rooms={state.eliminationRooms} players={state.players} />}
        </>
      )}

      {tab === "dieciseisavos" && (
        <R16View
          state={state}
          r16Pairings={r16Pairings}
          players={state.players}
          bestThirds={rankedClientBestThirds}
          eliminationRooms={phaseRooms("R16")}
          dateLabel={PHASE_ROOMS.dieciseisavos.dateLabel}
        />
      )}

      {["octavos", "cuartos", "semifinal"].includes(tab) && (
        <PhaseView
          state={state}
          tabKey={tab}
          phaseInfo={PHASE_ROOMS[tab]}
          eliminationRooms={phaseRooms(PHASE_ROOMS[tab].phase)}
          players={state.players}
        />
      )}
    </div>
  );
}

function R16View({
  state,
  r16Pairings,
  players,
  bestThirds,
  eliminationRooms,
  dateLabel,
}: {
  state: TournamentState;
  r16Pairings: BracketPairing[];
  players: TournamentState["players"];
  bestThirds: BestThird[];
  eliminationRooms: EliminationRoom[];
  dateLabel: string;
}) {
  const closed = state.groups.filter(g => g.finalRanking).length;
  const allClosed = closed === 12;

  if (eliminationRooms.length > 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Dieciseisavos de Final — Salas</h3>
          <span className="text-xs text-dorado">{dateLabel}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eliminationRooms.map(room => (
            <R16RoomCard key={room.roomId} room={room} players={players} />
          ))}
        </div>
        {bestThirds.length > 0 && <BestThirdsView thirds={bestThirds} players={players} />}
      </div>
    );
  }

  const totalSlots = 12;
  return (
    <div>
      <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Cuadro de Dieciseisavos</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {closed}/{totalSlots} grupos cerrados · 8 salas · 2 llaves por sala
            </p>
          </div>
          <span className="text-xs text-dorado">{dateLabel}</span>
          <div className="flex items-center gap-1.5">
            {state.groups.map(g => (
              <span
                key={g.groupId}
                className={`w-5 h-5 text-[9px] rounded flex items-center justify-center font-bold ${
                  g.finalRanking
                    ? "bg-verde/20 text-verde"
                    : "bg-white/10 text-white/30"
                }`}
              >
                {g.groupId}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {r16Pairings.map(room => (
            <div key={room.roomId} className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-dorado font-semibold mb-2">{room.roomId.replace("_", " ")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="text-[10px] text-white/30 uppercase tracking-wide">Llave A</span>
                  <p className="text-sm mt-0.5">
                    <span className={`font-medium ${room.bracketA.player1Id ? "text-rojo" : "text-white/20"}`}>
                      {room.bracketA.player1Name}
                    </span>
                    <span className="text-white/30 mx-2">vs</span>
                    <span className={room.bracketA.player2Id ? "text-white/80" : "text-white/20"}>
                      {room.bracketA.player2Name}
                    </span>
                  </p>
                </div>
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="text-[10px] text-white/30 uppercase tracking-wide">Llave B</span>
                  <p className="text-sm mt-0.5">
                    <span className={`font-medium ${room.bracketB.player1Id ? "text-rojo" : "text-white/20"}`}>
                      {room.bracketB.player1Name}
                    </span>
                    <span className="text-white/30 mx-2">vs</span>
                    <span className={room.bracketB.player2Id ? "text-white/80" : "text-white/20"}>
                      {room.bracketB.player2Name}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BestThirdsView thirds={bestThirds} players={players} />
    </div>
  );
}

function R16RoomCard({ room, players }: { room: EliminationRoom; players: TournamentState["players"] }) {
  return (
    <div className={`bg-navy-light rounded-xl shadow-lg border p-4 ${room.completed ? "border-white/10" : "border-rojo/40"}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">{room.roomId.replace("_", " ")}</h4>
        <span className="text-xs text-white/40">16vos</span>
      </div>
      {room.brackets.map((b) => {
        const p1 = playerName(players.find(p => p.id === b.player1Id), b.player1Id);
        const p2 = playerName(players.find(p => p.id === b.player2Id), b.player2Id);
        return (
          <div key={b.bracketId} className="flex items-center gap-2 text-sm mb-1">
            <span className="text-[10px] text-white/30 w-4">Llave {b.bracketId}:</span>
            <span className={b.winnerId === b.player1Id ? "text-verde font-medium" : "text-white/70"}>{p1}</span>
            <span className="text-white/30">vs</span>
            <span className={b.winnerId === b.player2Id ? "text-verde font-medium" : "text-white/70"}>{p2}</span>
            {b.winnerId && <span className="text-verde text-xs ml-1">✓</span>}
          </div>
        );
      })}
      {room.racePositions && (
        <div className="mt-2 pt-2 border-t border-white/10 flex gap-3 text-xs text-white/40">
          {[...room.racePositions].sort((a, b) => a.position - b.position).map((p) => (
            <span key={p.playerId}>{p.position}° {playerName(players.find(pl => pl.id === p.playerId), p.playerId)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const PHASE_NAMES: Record<string, { label: string; short: string }> = {
  R16: { label: "Octavos de Final", short: "8vos" },
  QF: { label: "Cuartos de Final", short: "4tos" },
  SF: { label: "Semifinales", short: "Semis" },
  F: { label: "Gran Final", short: "Final" },
};

function PhaseView({
  state,
  tabKey,
  phaseInfo,
  eliminationRooms,
  players,
}: {
  state: TournamentState;
  tabKey: string;
  phaseInfo: { rooms: number; advance: number; phase: string; date: string; dateLabel: string };
  eliminationRooms: EliminationRoom[];
  players: TournamentState["players"];
}) {
  const phaseName = PHASE_NAMES[phaseInfo.phase]?.label ?? phaseInfo.phase;
  const phaseShort = PHASE_NAMES[phaseInfo.phase]?.short ?? phaseInfo.phase;

  if (eliminationRooms.length > 0) {
    const active = eliminationRooms.filter(r => !r.completed);
    const done = eliminationRooms.filter(r => r.completed);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{phaseName} — Salas</h3>
          <span className="text-xs text-dorado">{phaseInfo.dateLabel}</span>
        </div>
        {active.length > 0 && (
          <div>
            <p className="text-xs text-dorado mb-3 font-medium">Activas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.map(room => (
                <GenericRoomCard key={room.roomId} room={room} phaseLabel={phaseShort} players={players} />
              ))}
            </div>
          </div>
        )}
        {done.length > 0 && (
          <div>
            <p className="text-xs text-white/40 mb-3 font-medium">Completadas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {done.map(room => (
                <GenericRoomCard key={room.roomId} room={room} phaseLabel={phaseShort} players={players} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const rooms: { id: string; label: string }[] = [];
  for (let i = 0; i < phaseInfo.rooms; i++) {
    const prefix = tabKey === "semifinal" ? "F" : phaseInfo.phase;
    rooms.push({ id: `${prefix}_SALA${i + 1}`, label: `Sala ${i + 1}` });
  }

  return (
    <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">{phaseName}</h3>
        <span className="text-xs text-dorado">{phaseInfo.dateLabel}</span>
      </div>
      <p className="text-xs text-white/40 mb-4">
        {phaseInfo.rooms} {phaseInfo.rooms === 1 ? "sala" : "salas"} · 2 llaves por sala
        {phaseInfo.advance > 0 && ` · ${phaseInfo.advance} jugadores avanzan`}
      </p>
      {phaseInfo.rooms > 1 ? (
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-dorado font-semibold mb-2">{room.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="text-[10px] text-white/30 uppercase tracking-wide">Llave A</span>
                  <p className="text-sm mt-0.5 text-white/20">Por definir</p>
                </div>
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="text-[10px] text-white/30 uppercase tracking-wide">Llave B</span>
                  <p className="text-sm mt-0.5 text-white/20">Por definir</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-xs text-dorado font-semibold mb-3">Sala Unica — Semifinales + Final</p>
          <div className="space-y-3">
            <div className="bg-white/5 rounded px-3 py-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wide">Semifinal 1</span>
              <p className="text-sm mt-0.5 text-white/20">Por definir vs Por definir</p>
            </div>
            <div className="bg-white/5 rounded px-3 py-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wide">Semifinal 2</span>
              <p className="text-sm mt-0.5 text-white/20">Por definir vs Por definir</p>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-white/40">La carrera final define el podio (1°, 2°, 3°).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenericRoomCard({ room, phaseLabel, players }: { room: EliminationRoom; phaseLabel: string; players: TournamentState["players"] }) {
  return (
    <div className={`bg-navy-light rounded-xl shadow-lg border p-4 ${room.completed ? "border-white/10" : "border-rojo/40"}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">{room.roomId.replace("_", " ")}</h4>
        <span className="text-xs text-white/40">{phaseLabel}</span>
      </div>
      {room.brackets.map((b) => {
        const p1 = playerName(players.find(p => p.id === b.player1Id), b.player1Id);
        const p2 = playerName(players.find(p => p.id === b.player2Id), b.player2Id);
        return (
          <div key={b.bracketId} className="flex items-center gap-2 text-sm mb-1">
            <span className="text-[10px] text-white/30 w-4">Llave {b.bracketId}:</span>
            <span className={b.winnerId === b.player1Id ? "text-verde font-medium" : "text-white/70"}>{p1}</span>
            <span className="text-white/30">vs</span>
            <span className={b.winnerId === b.player2Id ? "text-verde font-medium" : "text-white/70"}>{p2}</span>
            {b.winnerId && <span className="text-verde text-xs ml-1">✓</span>}
          </div>
        );
      })}
      {room.racePositions && (
        <div className="mt-2 pt-2 border-t border-white/10 flex gap-3 text-xs text-white/40">
          {[...room.racePositions].sort((a, b) => a.position - b.position).map((p) => (
            <span key={p.playerId}>{p.position}° {playerName(players.find(pl => pl.id === p.playerId), p.playerId)}</span>
          ))}
        </div>
      )}
      {room.penalties && room.penalties.length > 0 && (
        <div className="mt-2 text-xs text-rojo">Penalizaciones: {room.penalties.length}</div>
      )}
    </div>
  );
}

function computeAllThirds(state: TournamentState): BestThird[] {
  const allThirds: BestThird[] = [];
  for (const group of state.groups) {
    const ranking = group.finalRanking;
    if (!ranking) continue;
    const third = ranking.find(r => r.position === 3);
    if (!third) continue;
    const player = group.players.find(p => p.id === third.playerId);
    if (!player) continue;
    allThirds.push({
      playerId: third.playerId,
      groupId: group.groupId,
      groupPoints: third.groupPoints,
      totalMkPoints: third.totalMkPoints,
      botCount: player.botCount,
    });
  }
  return allThirds;
}

function GroupsView({ groups }: { groups: GroupStage[] }) {
  const grouped = new Map<string, GroupStage[]>();
  for (const g of groups) {
    const key = g.date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  }

  const dateLabels: Record<string, string> = {
    "2026-07-01T20:00:00": "Miercoles 1 de Julio — 8:00 PM",
    "2026-07-02T20:00:00": "Jueves 2 de Julio — 8:00 PM",
    "2026-07-05T21:00:00": "Domingo 5 de Julio — 9:00 PM",
    "2026-07-06T20:00:00": "Lunes 6 de Julio — 8:00 PM",
    "2026-07-08T20:00:00": "Miercoles 8 de Julio — 8:00 PM",
  };
  const postponedDates = new Set<string>();

  return (
    <div className="space-y-8">
      {[...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, grupos]) => {
          const isPostponed = postponedDates.has(date);
          return (
        <div key={date}>
          <h3 className="text-sm font-semibold text-dorado mb-3 uppercase tracking-wide">
            {isPostponed ? "⏰ Reprogramados" : dateLabels[date] ?? formatFecha(date)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {grupos.map((group) => {
              const closed = !!group.finalRanking;
              const color = group.groupId.charCodeAt(0) % 2 === 0 ? "border-blue-500/30" : "border-purple-500/30";
              return (
                <div key={group.groupId} className={`bg-navy-light rounded-xl shadow-lg border ${color} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">Grupo {group.groupId}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${closed ? "bg-verde/20 text-verde" : "bg-dorado/20 text-dorado"}`}>
                      {closed ? "Cerrado" : "Pendiente"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.players.map((p) => {
                      const isBot = p.name.includes("(BOT)");
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className={`w-1.5 h-1.5 rounded-full ${isBot ? "bg-red-500/50" : "bg-white/30"}`} />
                          <span className="break-words">{p.name.replace(" (BOT)", "")}</span>
                          {isBot && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded shrink-0">BOT</span>}
                        </div>
                      );
                    })}
                  </div>
                  {group.finalRanking && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/40 mb-1">Clasificacion Final:</p>
                      {group.finalRanking.map((r, i) => (
                        <div key={r.playerId} className="flex items-start justify-between gap-2 text-xs">
                          <span className={`break-words ${i === 0 ? "text-dorado" : i === 1 ? "text-white/80" : i === 2 ? "text-amber-700" : "text-white/40"}`}>
                            {i + 1}° {playerName(group.players.find(p => p.id === r.playerId), r.playerId)}
                          </span>
                          <span className="text-white/60 shrink-0">{r.groupPoints} pts ({r.totalMkPoints} MK)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
      })}
    </div>
  );
}

function BestThirdsView({ thirds, players }: { thirds: BestThird[]; players: TournamentState["players"] }) {
  if (!thirds || thirds.length === 0) return null;
  return (
    <div className="mt-6 bg-navy-light rounded-xl shadow-lg border border-amber-500/30 p-5">
      <h3 className="font-semibold mb-3">Ranking de Mejores Terceros</h3>
      <div className="space-y-1">
        {thirds.map((t, i) => {
          const isIn = t.rankPosition! <= 8;
          const cls = isIn ? "bg-verde/10 border border-verde/20" : "bg-white/5";
          return (
            <div key={t.playerId} className={`text-xs flex items-center justify-between p-2 rounded ${cls}`}>
              <span className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isIn ? "bg-verde/30 text-verde" : "bg-white/10 text-white/40"}`}>
                  {t.rankPosition}
                </span>
                <span className={isIn ? "text-verde" : "text-white/40"}>
                  {playerName(players.find(p => p.id === t.playerId), t.playerId)}
                </span>
              </span>
              <span className="text-white/40">Grupo {t.groupId} · {t.totalMkPoints} MK · {t.botCount} bots</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-white/40 mt-3">Los primeros 8 clasifican a dieciseisavos (fondo verde).</p>
    </div>
  );
}

function BracketInfo() {
  const phases = [
    { name: "Dieciseisavos", rooms: 8, advance: 16, desc: "8 salas de 4 jugadores. 2 llaves por sala. Avanza el ganador de cada llave (2 por sala)." },
    { name: "Octavos", rooms: 4, advance: 8, desc: "4 salas de 4 jugadores. Mismo sistema de llaves." },
    { name: "Cuartos de Final", rooms: 2, advance: 4, desc: "2 salas de 4 jugadores. Mismo sistema de llaves." },
    { name: "Semifinales + Final", rooms: 1, advance: 0, desc: "1 sala de 4 jugadores. 2 llaves semifinales. La carrera final define el podio (1°, 2°, 3°)." },
  ];

  return (
    <div className="mt-8 bg-navy-light rounded-xl shadow-lg border border-white/10 p-5">
      <h3 className="font-semibold mb-4">Formato de Eliminacion Directa</h3>
      <div className="space-y-4">
        {phases.map((p, i) => (
          <div key={p.name} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-rojo/20 text-rojo flex items-center justify-center text-sm font-bold">{i + 1}</div>
              {i < phases.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
            </div>
            <div className="pb-4">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-white/60 mt-0.5">{p.desc}</p>
              {p.advance > 0 && <p className="text-xs text-dorado mt-0.5">{p.advance} jugadores avanzan</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
        <p><strong>Ganador de llave:</strong> En cada llave (2 jugadores), avanza quien tenga mejor posicion en la carrera (menor numero).</p>
        <p className="mt-1"><strong>Empate:</strong> Si dos jugadores de la misma llave quedan en la misma posicion, se requiere desempate manual.</p>
      </div>
    </div>
  );
}

function EliminationView({ rooms, players }: { rooms: EliminationRoom[]; players: TournamentState["players"] }) {
  const activeRooms = rooms.filter(r => !r.completed);
  const doneRooms = rooms.filter(r => r.completed);
  if (rooms.length === 0) return null;
  return (
    <div className="mt-6 space-y-6">
      {activeRooms.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-dorado">Salas Activas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRooms.map((room) => (
              <RoomCard key={room.roomId} room={room} players={players} />
            ))}
          </div>
        </div>
      )}
      {doneRooms.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-white/60">Salas Completadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doneRooms.map((room) => (
              <RoomCard key={room.roomId} room={room} players={players} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, players }: { room: EliminationRoom; players: TournamentState["players"] }) {
  const bracketLabels: Record<string, string> = { R16: "16vos", QF: "4tos", SF: "Semi", F: "Final" };
  return (
    <div className={`bg-navy-light rounded-xl shadow-lg border p-4 ${room.completed ? "border-white/10" : "border-rojo/40"}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">{room.roomId.replace("_", " ")}</h4>
        <span className="text-xs text-white/40">{bracketLabels[room.phase] ?? room.phase}</span>
      </div>
      {room.brackets.map((b) => {
        const p1 = playerName(players.find(p => p.id === b.player1Id), b.player1Id);
        const p2 = playerName(players.find(p => p.id === b.player2Id), b.player2Id);
        return (
          <div key={b.bracketId} className="flex items-center gap-2 text-sm mb-1">
            <span className="text-[10px] text-white/30 w-4">Llave {b.bracketId}:</span>
            <span className={b.winnerId === b.player1Id ? "text-verde font-medium" : "text-white/70"}>{p1}</span>
            <span className="text-white/30">vs</span>
            <span className={b.winnerId === b.player2Id ? "text-verde font-medium" : "text-white/70"}>{p2}</span>
            {b.winnerId && <span className="text-verde text-xs ml-1">✓</span>}
          </div>
        );
      })}
      {room.racePositions && (
        <div className="mt-2 pt-2 border-t border-white/10 flex gap-3 text-xs text-white/40">
          {[...room.racePositions].sort((a, b) => a.position - b.position).map((p) => (
            <span key={p.playerId}>{p.position}° {playerName(players.find(pl => pl.id === p.playerId), p.playerId)}</span>
          ))}
        </div>
      )}
      {room.penalties && room.penalties.length > 0 && (
        <div className="mt-2 text-xs text-rojo">Penalizaciones: {room.penalties.length}</div>
      )}
    </div>
  );
}

function GoleadoresView({ scorers, players }: { scorers: TopScorer[]; players: TournamentState["players"] }) {
  const top10 = scorers.slice(0, 5);
  return (
    <div className="bg-navy-light rounded-xl shadow-lg border border-dorado/30 p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <span className="text-dorado">Goleadores</span>
        <span className="text-xs text-white/40 font-normal">Top acumulado de puntos MK</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs border-b border-white/10">
              <th className="text-left py-2 pr-2">#</th>
              <th className="text-left py-2 pr-2">Jugador</th>
              <th className="text-right py-2">Puntos MK</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((s, i) => {
              const p = players.find(pl => pl.id === s.playerId);
              return (
                <tr key={s.playerId} className="border-b border-white/5 hover:bg-white/5">
                  <td className={`py-2 pr-2 font-bold text-xs ${i === 0 ? "text-dorado" : i < 3 ? "text-white/80" : "text-white/40"}`}>
                    {i + 1}
                  </td>
                  <td className="py-2 pr-2 break-words">{p ? p.name.replace(" (BOT)", "") : s.playerId}</td>
                  <td className="py-2 text-right font-mono text-dorado">{s.totalMkPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
