"use client";

import { useState } from "react";
import type { Team } from "@/lib/types";

const PASSWORD = "rrl2026";

interface GroupRandomizerProps {
  players: Team[];
}

export default function GroupRandomizer({ players }: GroupRandomizerProps) {
  const [locked, setLocked] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [groups, setGroups] = useState<{ groupA: Team[]; groupB: Team[] } | null>(null);

  function shuffle() {
    const copy = [...players];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    const mid = Math.ceil(copy.length / 2);
    setGroups({ groupA: copy.slice(0, mid), groupB: copy.slice(mid) });
  }

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSWORD) {
      setError(false);
      setLocked(false);
      shuffle();
    } else {
      setError(true);
    }
  }

  if (players.length === 0) return null;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-zinc-50 text-lg font-bold mb-4">Randomizer de Salas</h3>

      {locked ? (
        <form onSubmit={handleUnlock} className="space-y-3">
          <p className="text-zinc-400 text-xs">Ingresa la contraseña para generar los grupos:</p>
          <div className="flex items-center gap-3">
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="Contraseña"
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-rojo w-48"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-rojo text-white text-sm font-medium rounded-lg hover:bg-rojo/80 transition"
            >
              Desbloquear
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">Contraseña incorrecta</p>}
        </form>
      ) : groups ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
              <h4 className="text-amber-400 font-bold text-sm mb-3">Sala A ({groups.groupA.length})</h4>
              <ol className="space-y-1.5">
                {groups.groupA.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500 font-mono w-5 text-xs">{i + 1}.</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-zinc-50">{p.name}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4">
              <h4 className="text-emerald-400 font-bold text-sm mb-3">Sala B ({groups.groupB.length})</h4>
              <ol className="space-y-1.5">
                {groups.groupB.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500 font-mono w-5 text-xs">{i + 1}.</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-zinc-50">{p.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={shuffle}
              className="px-4 py-2 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition"
            >
              Re-aleatorizar
            </button>
            <button
              onClick={() => { setLocked(true); setInput(""); setGroups(null); }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
            >
              Bloquear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
