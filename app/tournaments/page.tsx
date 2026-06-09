import Link from "next/link";
import { listTournaments } from "@/lib/storage";

export default function TournamentsPage() {
  const tournaments = listTournaments();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Torneos</h1>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 p-8 text-center text-white/40">
          No hay torneos registrados
        </div>
      ) : (
        <div className="bg-navy-light rounded-xl shadow-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Estado
                </th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                  Fechas
                </th>
                <th className="text-right px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="font-medium text-rojo hover:text-dorado"
                    >
                      {t.name}
                    </Link>
                    {t.description && (
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                        {t.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
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
                  </td>
                  <td className="px-4 py-3 text-white/60 hidden md:table-cell">
                    {new Date(t.startDate).toLocaleDateString("es")}
                    {t.endDate &&
                      ` - ${new Date(t.endDate).toLocaleDateString("es")}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="text-rojo hover:text-dorado text-xs"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
