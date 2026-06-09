import Link from "next/link";
import { listTournaments } from "@/lib/storage";

export default function Home() {
  const tournaments = listTournaments();

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <p className="text-white/60 mt-1">
            Torneos de Mario Kart
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-5">
          <p className="text-white/60 text-sm">Total Torneos</p>
          <p className="text-3xl font-bold mt-1 text-dorado">{tournaments.length}</p>
        </div>
        <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-5">
          <p className="text-white/60 text-sm">En Progreso</p>
          <p className="text-3xl font-bold mt-1 text-dorado">
            {tournaments.filter((t) => t.status === "in_progress").length}
          </p>
        </div>
        <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-5">
          <p className="text-white/60 text-sm">Completados</p>
          <p className="text-3xl font-bold mt-1 text-verde">
            {tournaments.filter((t) => t.status === "completed").length}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Torneos Recientes</h2>
      {tournaments.length === 0 ? (
        <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">
          No hay torneos aun. Crea tu primer torneo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.slice(0, 6).map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-5 hover:border-rojo/50 transition"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg">{t.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    t.status === "completed"
                      ? "bg-verde/20 text-verde"
                      : t.status === "in_progress"
                      ? "bg-dorado/20 text-dorado"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {t.status === "completed"
                    ? "Completado"
                    : t.status === "in_progress"
                    ? "En curso"
                    : "Pendiente"}
                </span>
              </div>
              {t.description && (
                <p className="text-sm text-white/60 mt-1 line-clamp-2">
                  {t.description}
                </p>
              )}
              <p className="text-xs text-white/40 mt-3">
                {new Date(t.startDate).toLocaleDateString("es")}
                {t.endDate && ` - ${new Date(t.endDate).toLocaleDateString("es")}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
