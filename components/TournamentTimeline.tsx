const STEPS = [
  {
    title: "Registro Gratuito",
    description:
      "Inscripcion sin costo antes del cierre (6 horas antes de la jornada 1).",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Pretemporada",
    description:
      "4 jornadas clasificatorias gratis los domingos a las 8:00 PM para definir divisiones.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Pago de Inscripcion",
    description:
      "Al conocer tu division, pago de $25.000 COP a la llave Nequi @OKR604.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Temporada Oficial",
    description:
      "6 fechas de 12 carreras cada una (Division 1 vs Division 2).",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Gran Final & Podio",
    description:
      "Definicion de ganadores y transferencia directa de premios por Nequi.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

export default function TournamentTimeline() {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-zinc-50 text-lg font-bold mb-6">Flujo del Torneo</h3>

      <div className="relative">
        <div className="absolute left-6 top-2 bottom-2 w-px bg-zinc-800" />

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex items-start gap-5">
              <div className="relative z-10 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                {step.icon}
              </div>
              <div className="pt-2.5">
                <p className="text-zinc-50 font-semibold text-sm">{step.title}</p>
                <p className="text-zinc-400 text-xs mt-1 max-w-md">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
