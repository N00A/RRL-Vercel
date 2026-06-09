export default function DivisionRules({
  divisions = 2,
}: {
  divisions?: number;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-zinc-50 text-lg font-bold mb-4">
        {divisions === 1
          ? "Sistema de Puntos"
          : "Sistema de Puntos y Divisiones"}
      </h3>

      <div
        className={
          divisions === 1
            ? "grid grid-cols-1 gap-4"
            : "grid grid-cols-1 md:grid-cols-2 gap-4"
        }
      >
        <div
          className={
            divisions === 1
              ? "border border-amber-500/30 bg-amber-500/5 rounded-xl p-5"
              : "border border-amber-500/30 bg-amber-500/5 rounded-xl p-5"
          }
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h4 className="text-amber-400 font-bold">
              {divisions === 1 ? "Unica Division" : "Division 1 — Elite"}
            </h4>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">●</span>
              <div>
                <p className="text-zinc-50 text-sm font-medium">Indicador</p>
                <p className="text-zinc-400 text-xs">
                  {divisions === 1
                    ? "Todos los jugadores inscritos"
                    : "Los 12 mejores de la Pretemporada"}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">●</span>
              <div>
                <p className="text-zinc-50 text-sm font-medium">Formato</p>
                <p className="text-zinc-400 text-xs">
                  Todos contra todos en un unico grupo
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">●</span>
              <div>
                <p className="text-zinc-50 text-sm font-medium">Metrica</p>
                <p className="text-zinc-400 text-xs">
                  12 carreras por jornada durante 6 fechas
                </p>
              </div>
            </li>
          </ul>
        </div>

        {divisions !== 1 && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <h4 className="text-emerald-400 font-bold">
                Division 2 — Desarrollo
              </h4>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">●</span>
                <div>
                  <p className="text-zinc-50 text-sm font-medium">Indicador</p>
                  <p className="text-zinc-400 text-xs">
                    Todos los demas jugadores
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">●</span>
                <div>
                  <p className="text-zinc-50 text-sm font-medium">Formato</p>
                  <p className="text-zinc-400 text-xs">
                    Distribucion en 3 grupos competitivos
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-500 mt-0.5">●</span>
                <div>
                  <p className="text-zinc-50 text-sm font-medium">Metrica</p>
                  <p className="text-zinc-400 text-xs">
                    12 carreras por jornada durante 6 fechas
                  </p>
                </div>
              </li>
            </ul>
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
              <p className="text-emerald-400 text-xs font-semibold text-center">
                Gran Final presencial/online — Top 3 de cada grupo definen el
                podio final
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
