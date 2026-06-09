export const PUNTOS_POR_POSICION: Record<number, number> = {
  1: 15,
  2: 12,
  3: 10,
  4: 9,
  5: 8,
  6: 7,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
  11: 2,
  12: 1,
};

export const PENALIZACIONES = {
  repickPista: {
    puntos: -7,
    descripcion:
      "Repetir una pista ya jugada (incluyendo selección aleatoria)",
  },
};

export const DIVISION_2_CONFIG = {
  maxJugadores: 32,
  minJugadores: 25,
  grupos: ["A", "B", "C"],
  faseGruposFechas: [1, 2, 3, 4, 5],
  granFinalFecha: 6,
  clasificadosFinalPorGrupo: 3,
  totalJugadoresFinal: 9,
};

export const LEAGUE_CONFIG = {
  registrationFee: 25000,
  currency: "COP",
  paymentMethod: "@OKR604",
  schedule: {
    day: "Domingos",
    time: "8:00 PM",
    preseasonWeeks: 4,
    officialWeeks: 6,
    racesPerJornada: 12,
  },
  prizeDistribution: {
    division1Allocation: 0.5,
    division2Allocation: 0.5,
    podiumPercentages: {
      first: 0.5,
      second: 0.35,
      third: 0.15,
    },
  },
};
