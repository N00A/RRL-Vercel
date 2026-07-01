"use client";

import { useState, useEffect } from "react";
import type { TournamentState, GroupStage, EliminationRoom } from "@/types/tournament";

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

export default function MundialPage() {
  const [state, setState] = useState<TournamentState | null>(null);
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
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-12 text-white/40">Cargando Mundial 2026...</div>;
  if (error) return <div className="text-center py-12 text-rojo">{error}</div>;
  if (!state) return <div className="text-center py-12 text-white/40">Sin datos</div>;

  return (
    <div>
      <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mario Kart Mundial 2026</h1>
            <p className="text-white/60 text-sm mt-1">48 selecciones — 12 grupos de 4</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${PHASE_COLORS[state.phase]}`}>
            {PHASE_LABELS[state.phase]}
          </span>
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

      {state.phase === "GROUPS" && (
        <>
          <GroupsView groups={state.groups} />
          <BestThirdsInfo />
          <BracketInfo />
        </>
      )}
      {state.bestThirds && <BestThirdsView thirds={state.bestThirds} players={state.players} />}
      {state.eliminationRooms.length > 0 && <EliminationView rooms={state.eliminationRooms} players={state.players} />}
    </div>
  );
}

function GroupsView({ groups }: { groups: GroupStage[] }) {
  const jornadas = [
    { label: "Miercoles 1 de Julio — 8:00 PM", grupos: groups.filter(g => ["A","B","C","D"].includes(g.groupId)) },
    { label: "Jueves 2 de Julio — 8:00 PM", grupos: groups.filter(g => ["E","F","G","H"].includes(g.groupId)) },
    { label: "Lunes 6 de Julio — 8:00 PM", grupos: groups.filter(g => ["I","J","K","L"].includes(g.groupId)) },
  ];

  return (
    <div className="space-y-8">
      {jornadas.map((j) => (
        <div key={j.label}>
          <h3 className="text-sm font-semibold text-dorado mb-3 uppercase tracking-wide">{j.label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {j.grupos.map((group) => {
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
      ))}
    </div>
  );
}

function BestThirdsInfo() {
  return (
    <div className="mt-8 bg-navy-light rounded-xl shadow-lg border border-amber-500/30 p-5">
      <h3 className="font-semibold mb-3">Mejores Terceros</h3>
      <p className="text-sm text-white/60 mb-3">
        Los 12 equipos que queden en 3<sup>er</sup> lugar de cada grupo se ordenan para determinar los 8 que clasifican a dieciseisavos.
      </p>
      <div className="text-sm space-y-1 text-white/70">
        <p><span className="text-dorado">1.</span> Puntos de grupo (todos tendran 3)</p>
        <p><span className="text-dorado">2.</span> Puntos MK totales <span className="text-white/40">(mayor = mejor)</span></p>
        <p><span className="text-dorado">3.</span> Cantidad de BOTs en el grupo <span className="text-white/40">(menos bots = grupo mas dificil = prevalece)</span></p>
        <p><span className="text-dorado">4.</span> Sorteo externo en caso de empate total</p>
      </div>
      <p className="text-xs text-white/40 mt-3">
        Clasifican los 8 mejores terceros. La tabla se calculara automaticamente al cerrar todos los grupos.
      </p>
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

function BestThirdsView({ thirds, players }: { thirds: TournamentState["bestThirds"]; players: TournamentState["players"] }) {
  if (!thirds) return null;
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

function EliminationView({ rooms, players }: { rooms: EliminationRoom[]; players: TournamentState["players"] }) {
  const activeRooms = rooms.filter(r => !r.completed);
  const doneRooms = rooms.filter(r => r.completed);
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
