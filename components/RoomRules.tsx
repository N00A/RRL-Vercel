"use client";

import { useState } from "react";

const rules = [
  {
    id: "schedule",
    icon: "🕐",
    title: "Horarios",
    content: (
      <div className="space-y-2 text-sm">
        <p className="text-zinc-300">
          La sala se abre a las{" "}
          <span className="text-zinc-50 font-semibold">7:55 PM</span> y la
          primera carrera inicia a las{" "}
          <span className="text-zinc-50 font-semibold">8:00 PM</span> en punto.
        </p>
        <p className="text-zinc-300">
          Hay un margen de{" "}
          <span className="text-amber-400 font-semibold">5 minutos</span> de
          gracia despues del inicio para ingresar a la sala.
        </p>
      </div>
    ),
  },
  {
    id: "late",
    icon: "⏰",
    title: "Ingreso Tardio",
    content: (
      <div className="space-y-2 text-sm">
        <p className="text-zinc-300">
          Si un jugador llega tarde, puede unirse a la sala siempre que no se
          haya superado la{" "}
          <span className="text-zinc-50 font-semibold">carrera 6</span>.
        </p>
        <p className="text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2">
          Si el ingreso ocurre despues de la carrera 6, el puntaje de esa
          jornada <span className="font-bold">no cuenta</span> para el
          escalafon.
        </p>
      </div>
    ),
  },
  {
    id: "disconnect",
    icon: "📡",
    title: "Desconexiones",
    content: (
      <div className="space-y-2 text-sm">
        <p className="text-zinc-300">
          En caso de desconexion, se realiza la{" "}
          <span className="text-zinc-50 font-semibold">sumatoria</span> de los
          puntos acumulados antes y despues de la desconexion.
        </p>
        <p className="text-zinc-300">
          Es <span className="text-amber-400 font-semibold">obligatorio</span>{" "}
          reportar la desconexion en el grupo oficial de RRL para que los puntos
          sean validados.
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <p className="text-zinc-400 text-xs">
            Formula: Puntos Finales = Puntos (carreras antes) + Puntos (carreras
            despues)
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "external",
    icon: "🚪",
    title: "Jugador Externo",
    content: (
      <div className="space-y-2 text-sm">
        <p className="text-zinc-300">
          Si un jugador externo (no inscrito en RRL) ingresa a la sala:
        </p>
        <ol className="space-y-2 list-decimal list-inside">
          <li className="text-zinc-300">
            La sala se{" "}
            <span className="text-red-400 font-semibold">cierra de inmediato</span>
          </li>
          <li className="text-zinc-300">
            Se guardan los puntos acumulados hasta ese momento
          </li>
          <li className="text-zinc-300">
            Se reinicia una{" "}
            <span className="text-zinc-50 font-semibold">nueva sala</span> para
            completar las carreras restantes del total de 12
          </li>
        </ol>
      </div>
    ),
  },
];

export default function RoomRules() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-zinc-50 text-lg font-bold mb-4">
        Reglas de Sala
      </h3>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === rule.id ? null : rule.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/80 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{rule.icon}</span>
                <span className="text-zinc-50 font-medium text-sm">
                  {rule.title}
                </span>
              </div>
              <span
                className={`text-zinc-500 transition-transform duration-200 ${open === rule.id ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>
            {open === rule.id && (
              <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800">
                {rule.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
