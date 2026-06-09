export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "pending" | "in_progress" | "completed";
  divisions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  color: string;
  createdAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  team1Id: string;
  team2Id: string;
  score1: number | null;
  score2: number | null;
  status: "scheduled" | "in_progress" | "completed";
  winnerId: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface RaceResult {
  id: string;
  tournamentId: string;
  playerId: string;
  round: number;
  positions?: number[];
  repickCount: number;
  totalPoints: number;
  group?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStanding {
  playerId: string;
  playerName: string;
  playerShortName: string;
  playerColor: string;
  rounds: { round: number; points: number; repickCount: number; group?: string; groupPosition?: number }[];
  totalPoints: number;
  penalizationPoints: number;
  finalPoints: number;
}

export interface Standing {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamColor: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export type TournamentFormData = Pick<
  Tournament,
  "name" | "description" | "startDate" | "endDate"
>;

export type TeamFormData = Pick<Team, "name" | "shortName" | "color">;

export type MatchFormData = {
  round: number;
  team1Id: string;
  team2Id: string;
  date: string;
};
