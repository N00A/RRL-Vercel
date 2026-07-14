"use client";

import React, { useState, useEffect } from "react";
import type { Tournament, Team, Match, RaceResult, PlayerStanding } from "@/lib/types";
import { LEAGUE_CONFIG, PUNTOS_POR_POSICION, PENALIZACIONES } from "@/constants/tournament";
import DivisionRules from "@/components/DivisionRules";
import TournamentTimeline from "@/components/TournamentTimeline";
import RoomRules from "@/components/RoomRules";
import GroupRandomizer from "@/components/GroupRandomizer";

export default function TournamentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [playerStandings, setPlayerStandings] = useState<PlayerStanding[]>([]);
  const [tab, setTab] = useState<"info" | "standings" | "players" | "matches">("info");
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState(1);

  useEffect(() => {
    fetch(`/api/tournaments/${params.id}`)
      .then((r) => r.json())
      .then(setTournament);
    Promise.all([
      fetch(`/api/tournaments/${params.id}/teams`).then((r) => r.json()),
      fetch(`/api/tournaments/${params.id}/matches`).then((r) => r.json()),
      fetch(`/api/tournaments/${params.id}/results`).then((r) => r.json()),
    ]).then(([playersData, matchesData, resultsData]) => {
      setPlayers(playersData);
      setMatches(matchesData);
      setRaceResults(resultsData);
      setLoading(false);
      computePlayerStandings(playersData, resultsData);
    });
  }, []);

  function computePlayerStandings(playersData: Team[], resultsData: RaceResult[]) {
    const playerMap = new Map<string, PlayerStanding>();

    for (const p of playersData) {
      playerMap.set(p.id, {
        playerId: p.id,
        playerName: p.name,
        playerShortName: p.shortName,
        playerColor: p.color,
        rounds: [],
        totalPoints: 0,
        penalizationPoints: 0,
        finalPoints: 0,
      });
    }

    const rounds = [...new Set(resultsData.map((r) => r.round))].sort();

    for (const round of rounds) {
      const roundResults = resultsData.filter((r) => r.round === round);
      const groups = [...new Set(roundResults.map((r) => r.group || "1"))].sort();
      for (const group of groups) {
        const groupSorted = roundResults
          .filter((r) => (r.group || "1") === group)
          .sort((a, b) => b.totalPoints - a.totalPoints);
        groupSorted.forEach((r, idx) => {
          const player = playerMap.get(r.playerId);
          if (!player) return;
          const posPts = PUNTOS_POR_POSICION[idx + 1] || 0;
          player.rounds.push({
            round: r.round,
            points: posPts,
            repickCount: 0,
            group,
            groupPosition: idx + 1,
          });
          player.totalPoints += posPts;
        });
      }
    }

    for (const player of playerMap.values()) {
      player.finalPoints = player.totalPoints + player.penalizationPoints;
      player.rounds.sort((a, b) => a.round - b.round);
    }

    const standings = Array.from(playerMap.values());
    const countFirsts = (p: PlayerStanding) => p.rounds.filter((r) => r.groupPosition === 1).length;
    standings.sort(
      (a, b) => b.finalPoints - a.finalPoints || countFirsts(b) - countFirsts(a) || b.totalPoints - a.totalPoints
    );
    setPlayerStandings(standings);
  }

  if (loading)
    return <div className="text-center py-12 text-white/40">Cargando...</div>;
  if (!tournament)
    return <div className="text-center py-12 text-white/40">Torneo no encontrado</div>;

  const isMK8 = tournament.name.includes("MK8");
  const totalRounds = isMK8 ? 6 : 0;

  return (
    <div>
      <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            {tournament.description && <p className="text-white/60 mt-1">{tournament.description}</p>}
            <p className="text-xs text-white/40 mt-2">
              {new Date(tournament.startDate).toLocaleDateString("es")}
              {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString("es")}`}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${tournament.status === "completed" ? "bg-verde/20 text-verde" : tournament.status === "in_progress" ? "bg-dorado/20 text-dorado" : "bg-white/10 text-white/60"}`}>
            {tournament.status === "completed" ? "Completado" : tournament.status === "in_progress" ? "En curso" : "Pendiente"}
          </span>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/10">
        {(["info", "standings", "players", "matches"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? "border-rojo text-rojo" : "border-transparent text-white/60 hover:text-white"}`}>
            {t === "info" ? "Info" : t === "standings" ? "Clasificacion" : t === "players" ? (isMK8 ? "Pilotos" : "Equipos") : "Rondas"}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-6">
          <TournamentTimeline />
          <DivisionRules divisions={tournament.divisions} />
          {players.length > 0 && (
            <PrizeDisplay
              playersCount={players.length}
              divisions={tournament.divisions ?? 2}
            />
          )}
          {isMK8 && <RoomRules />}
          {isMK8 && <GroupRandomizer players={players} />}
        </div>
      )}

      {tab === "standings" && (
        <div className="space-y-6">
          {isMK8 ? (
            <>
              {!playerStandings.length ? (
                <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">No hay datos de clasificacion</div>
              ) : (
                <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Piloto</th>
                          {Array.from({ length: totalRounds }, (_, i) => (
                            <th key={i} className="px-2 py-2 text-center text-xs" colSpan={2}>
                              F{i + 1}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-bold">Pts</th>
                        </tr>
                        <tr className="bg-white/5">
                          <th colSpan={2} />
                          {Array.from({ length: totalRounds }, (_, i) => (
                            <React.Fragment key={i}>
                              <th className="px-1 py-1 text-center text-[10px] text-white/30 font-mono">#</th>
                              <th className="px-1 py-1 text-center text-[10px] text-white/30 font-mono">Pts</th>
                            </React.Fragment>
                          ))}
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {playerStandings.map((s, i) => (
                          <tr key={s.playerId} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            <td className="px-3 py-2 text-white/40 font-medium">{i + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.playerColor }} />
                                <span className="font-medium">{s.playerName}</span>
                                <span className="text-xs text-white/40 hidden sm:inline">{s.playerShortName}</span>
                              </div>
                            </td>
                            {Array.from({ length: totalRounds }, (_, r) => {
                              const rd = s.rounds.find((d) => d.round === r + 1);
                              return (
                                <React.Fragment key={r}>
                                  <td className="px-1 py-2 text-center font-mono text-[11px]">
                                    {rd ? (
                                      <span className="text-zinc-400">{rd.groupPosition}°</span>
                                    ) : (
                                      <span className="text-white/20">-</span>
                                    )}
                                  </td>
                                  <td className="px-1 py-2 text-center font-mono text-xs">
                                    {rd ? (
                                      <span className="text-amber-400 font-bold">{rd.points}</span>
                                    ) : (
                                      <span className="text-white/20">-</span>
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td className="px-3 py-2 text-center font-bold text-lg font-mono text-amber-400">
                              {s.finalPoints}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
                <h4 className="text-zinc-50 font-semibold text-sm mb-3">Sistema de Puntuacion</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((pos) => (
                    <div key={pos} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-center">
                      <span className="text-zinc-400 text-xs">{pos}°</span>
                      <p className="text-zinc-50 font-bold font-mono">{PUNTOS_POR_POSICION[pos]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
                  <p className="text-red-400 text-xs">
                    Penalizacion por repick: {PENALIZACIONES.repickPista.puntos} pts — {PENALIZACIONES.repickPista.descripcion}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">
              Clasificacion no disponible para este torneo
            </div>
          )}
        </div>
      )}

      {tab === "players" && (
        !players.length
          ? <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">No hay {isMK8 ? "pilotos" : "equipos"} registrados</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((t) => (
                <div key={t.id} className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-4 flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-white/40">{t.shortName}</p>
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab === "matches" && (
        !raceResults.length
          ? <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">No hay resultados registrados</div>
          : <div className="space-y-6">
              <div className="flex items-center gap-3">
                <label className="text-sm text-white/60">Fecha:</label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(Number(e.target.value))}
                  className="bg-navy-light border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-medium focus:outline-none focus:border-rojo appearance-none cursor-pointer"
                >
                  {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>Fecha {r}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const round = selectedRound;
                const roundResults = raceResults.filter((r) => r.round === round);
                if (!roundResults.length) return <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">Sin resultados para esta fecha</div>;
                const groups = [...new Set(roundResults.map((r) => r.group || "A"))].sort();

                return (
                  <div>
                    <div className="space-y-4">
                      {groups.map((group) => {
                        const groupResults = roundResults.filter((r) => (r.group || "A") === group);
                        const sorted = [...groupResults].sort((a, b) => b.totalPoints - a.totalPoints);
                        const hasPositions = groupResults.some((r) => r.positions);
                        return (
                          <div key={group}>
                            <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wide">
                              Sala {group} ({groupResults.length} jugadores)
                            </p>
                            <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                      <th className="px-2 py-2 text-left text-xs">#</th>
                                      <th className="px-2 py-2 text-left text-xs">Piloto</th>
                                      {hasPositions && Array.from({ length: 12 }, (_, j) => (
                                        <th key={j} className="px-1 py-2 text-center text-xs font-mono">C{j + 1}</th>
                                      ))}
                                      <th className="px-2 py-2 text-center text-xs text-red-400">Pen</th>
                                      <th className="px-2 py-2 text-center text-xs font-bold">Pts</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sorted.map((r, idx) => {
                                      const player = players.find((p) => p.id === r.playerId);
                                      const penal = r.repickCount * PENALIZACIONES.repickPista.puntos;
                                      return (
                                        <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                          <td className="px-2 py-2 text-white/40 font-medium text-xs">{idx + 1}</td>
                                          <td className="px-2 py-2">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: player?.color || "#ccc" }} />
                                              <span className="font-medium text-xs whitespace-nowrap">{player?.name || "?"}</span>
                                            </div>
                                          </td>
                                          {hasPositions && r.positions && r.positions.map((pos, j) => (
                                            <td key={j} className="px-1 py-2 text-center font-mono text-xs">
                                              <span className={pos <= 3 ? "text-amber-400 font-bold" : "text-zinc-50"}>
                                                {pos}°
                                              </span>
                                            </td>
                                          ))}
                                          {hasPositions && !r.positions && Array.from({ length: 12 }, (_, j) => (
                                            <td key={j} className="px-1 py-2 text-center font-mono text-xs text-white/20">-</td>
                                          ))}
                                          <td className="px-2 py-2 text-center font-mono text-xs text-red-400">
                                            {r.repickCount > 0 ? `${r.repickCount}×(-7)` : 0}
                                          </td>
                                          <td className="px-2 py-2 text-center font-bold font-mono text-amber-400">
                                            {r.totalPoints}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-4 text-xs">
                      <span className="text-zinc-400">Clasificacion general tras fecha {round}:</span>
                      {[...raceResults.filter((r) => r.round <= round)]
                        .reduce<{ id: string; pts: number }[]>((acc, r) => {
                          const existing = acc.find((a) => a.id === r.playerId);
                          if (existing) existing.pts += r.totalPoints;
                          else acc.push({ id: r.playerId, pts: r.totalPoints });
                          return acc;
                        }, [])
                        .sort((a, b) => b.pts - a.pts)
                        .slice(0, 3)
                        .map((p, i) => {
                          const player = players.find((pl) => pl.id === p.id);
                          return (
                            <span key={p.id}>
                              <span className="text-amber-400 font-bold">{i + 1}°</span>{" "}
                              {player?.name || "?"}{" "}
                              <span className="text-zinc-500">({p.pts} pts)</span>
                            </span>
                          );
                        })}
                    </div>
                  </div>
                );
              })()}
            </div>
      )}
    </div>
  );
}

function PrizeDisplay({
  playersCount,
  divisions = 2,
}: {
  playersCount: number;
  divisions?: number;
}) {
  const totalPool = playersCount * LEAGUE_CONFIG.registrationFee;
  const pct = LEAGUE_CONFIG.prizeDistribution.podiumPercentages;

  let div1Pool: number;
  let div2Pool: number | null;

  if (divisions === 1) {
    div1Pool = totalPool;
    div2Pool = null;
  } else {
    div1Pool =
      totalPool * LEAGUE_CONFIG.prizeDistribution.division1Allocation;
    div2Pool =
      totalPool * LEAGUE_CONFIG.prizeDistribution.division2Allocation;
  }

  const fmt = (v: number) => `$${v.toLocaleString("es-CO")} COP`;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-zinc-50 text-lg font-bold mb-4">
        Premios ({playersCount} jugadores)
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-zinc-400 text-xs">Pozo Total</p>
          <p className="text-amber-400 font-bold text-lg">{fmt(totalPool)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-zinc-400 text-xs">Inscripcion</p>
          <p className="text-zinc-50 font-bold text-lg">
            {fmt(LEAGUE_CONFIG.registrationFee)}
          </p>
        </div>
      </div>

      {div2Pool !== null && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
            <p className="text-amber-400 text-xs font-semibold mb-2">
              Division 1 — Elite
            </p>
            <p className="text-2xl font-bold text-zinc-50">{fmt(div1Pool)}</p>
          </div>
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4">
            <p className="text-emerald-400 text-xs font-semibold mb-2">
              Division 2 — Desarrollo
            </p>
            <p className="text-2xl font-bold text-zinc-50">
              {fmt(div2Pool)}
            </p>
          </div>
        </div>
      )}

      {div2Pool === null && (
        <div className="mb-6">
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
            <p className="text-amber-400 text-xs font-semibold mb-2">
              Pozo Unico
            </p>
            <p className="text-2xl font-bold text-zinc-50">{fmt(div1Pool)}</p>
          </div>
        </div>
      )}

      <table className="w-full text-sm border border-zinc-800 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800">
            <th className="text-left px-4 py-2 text-zinc-400 font-medium">
              Puesto
            </th>
            <th className="text-right px-4 py-2 text-zinc-400 font-medium">
              %
            </th>
            <th className="text-right px-4 py-2 text-zinc-50 font-medium">
              {divisions === 1 ? "Premio" : "Div 1"}
            </th>
            {div2Pool !== null && (
              <th className="text-right px-4 py-2 text-emerald-400 font-medium">
                Div 2
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {[
            { pos: "1°", pct: pct.first, color: "text-amber-400" },
            { pos: "2°", pct: pct.second, color: "text-zinc-300" },
            { pos: "3°", pct: pct.third, color: "text-amber-700" },
          ].map((p) => (
            <tr key={p.pos} className="border-b border-zinc-800 last:border-0">
              <td className={`px-4 py-2 font-bold ${p.color}`}>{p.pos}</td>
              <td className="px-4 py-2 text-right text-zinc-400">
                {(p.pct * 100)}%
              </td>
              <td className="px-4 py-2 text-right text-zinc-50">
                {fmt(Math.round(div1Pool * p.pct))}
              </td>
              {div2Pool !== null && (
                <td className="px-4 py-2 text-right text-zinc-50">
                  {fmt(Math.round(div2Pool * p.pct))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-center">
        <p className="text-amber-400 text-xs font-semibold">
          El campeon de{" "}
          {divisions === 1
            ? "la division"
            : "cada division"}{" "}
          gana inscripcion GRATIS para la siguiente temporada
        </p>
      </div>
    </div>
  );
}
