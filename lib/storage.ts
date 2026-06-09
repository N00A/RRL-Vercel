import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  Tournament,
  Team,
  Match,
  Standing,
  TournamentFormData,
  TeamFormData,
  MatchFormData,
  RaceResult,
  PlayerStanding,
} from "./types";
import { PUNTOS_POR_POSICION, PENALIZACIONES } from "@/constants/tournament";

const DATA_DIR =
  process.env.VERCEL === "1"
    ? "/tmp/data"
    : path.join(process.cwd(), "data");

const SOURCE_DATA_DIR = path.join(process.cwd(), "data");

const TOURNAMENTS_FILE = "tournaments.json";
const TEAMS_FILE = "teams.json";
const MATCHES_FILE = "matches.json";
const RESULTS_FILE = "results.json";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filename: string, fallback: T): T {
  ensureDir(DATA_DIR);
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    const sourcePath = path.join(SOURCE_DATA_DIR, filename);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, filePath);
    } else {
      writeJson(filename, fallback);
      return fallback;
    }
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(filename: string, data: T) {
  ensureDir(DATA_DIR);
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function getTournaments(): Tournament[] {
  return readJson<Tournament[]>(TOURNAMENTS_FILE, []);
}

function saveTournaments(data: Tournament[]) {
  writeJson(TOURNAMENTS_FILE, data);
}

function getTeams(): Team[] {
  return readJson<Team[]>(TEAMS_FILE, []);
}

function saveTeams(data: Team[]) {
  writeJson(TEAMS_FILE, data);
}

function getMatches(): Match[] {
  return readJson<Match[]>(MATCHES_FILE, []);
}

function saveMatches(data: Match[]) {
  writeJson(MATCHES_FILE, data);
}

export function listTournaments(): Tournament[] {
  return getTournaments().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getTournament(id: string): Tournament | null {
  return getTournaments().find((t) => t.id === id) ?? null;
}

export function createTournament(data: TournamentFormData): Tournament {
  const now = new Date().toISOString();
  const tournament: Tournament = {
    id: uuidv4(),
    ...data,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const all = getTournaments();
  all.push(tournament);
  saveTournaments(all);
  return tournament;
}

export function updateTournament(
  id: string,
  data: Partial<TournamentFormData> & { status?: Tournament["status"] }
): Tournament | null {
  const all = getTournaments();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveTournaments(all);
  return all[idx];
}

export function deleteTournament(id: string): boolean {
  const all = getTournaments().filter((t) => t.id !== id);
  if (all.length === getTournaments().length) return false;
  saveTournaments(all);

  const teams = getTeams().filter((t) => t.tournamentId !== id);
  saveTeams(teams);
  const matches = getMatches().filter((m) => m.tournamentId !== id);
  saveMatches(matches);
  return true;
}

export function listTeams(tournamentId: string): Team[] {
  return getTeams().filter((t) => t.tournamentId === tournamentId);
}

export function createTeam(
  tournamentId: string,
  data: TeamFormData
): Team {
  const now = new Date().toISOString();
  const team: Team = {
    id: uuidv4(),
    tournamentId,
    ...data,
    createdAt: now,
  };
  const all = getTeams();
  all.push(team);
  saveTeams(all);
  return team;
}

export function updateTeam(
  id: string,
  data: Partial<TeamFormData>
): Team | null {
  const all = getTeams();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data };
  saveTeams(all);
  return all[idx];
}

export function deleteTeam(id: string): boolean {
  const all = getTeams().filter((t) => t.id !== id);
  if (all.length === getTeams().length) return false;
  saveTeams(all);
  return true;
}

export function listMatches(tournamentId: string): Match[] {
  return getMatches()
    .filter((m) => m.tournamentId === tournamentId)
    .sort((a, b) => a.round - b.round || a.date.localeCompare(b.date));
}

export function createMatch(
  tournamentId: string,
  data: MatchFormData
): Match {
  const now = new Date().toISOString();
  const match: Match = {
    id: uuidv4(),
    tournamentId,
    score1: null,
    score2: null,
    status: "scheduled",
    winnerId: null,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const all = getMatches();
  all.push(match);
  saveMatches(all);
  return match;
}

export function updateMatch(
  id: string,
  data: Partial<{
    score1: number;
    score2: number;
    status: Match["status"];
    round: number;
    date: string;
    team1Id: string;
    team2Id: string;
  }>
): Match | null {
  const all = getMatches();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated: Match = {
    ...all[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.score1 !== undefined && data.score2 !== undefined) {
    updated.score1 = data.score1;
    updated.score2 = data.score2;
    if (data.score1 > data.score2) {
      updated.winnerId = updated.team1Id;
      updated.status = "completed";
    } else if (data.score2 > data.score1) {
      updated.winnerId = updated.team2Id;
      updated.status = "completed";
    } else {
      updated.winnerId = null;
      updated.status = "completed";
    }
  }

  all[idx] = updated;
  saveMatches(all);
  return all[idx];
}

export function deleteMatch(id: string): boolean {
  const all = getMatches().filter((m) => m.id !== id);
  if (all.length === getMatches().length) return false;
  saveMatches(all);
  return true;
}

function getResults(): RaceResult[] {
  return readJson<RaceResult[]>(RESULTS_FILE, []);
}

function saveResults(data: RaceResult[]) {
  writeJson(RESULTS_FILE, data);
}

export function listRaceResults(tournamentId: string): RaceResult[] {
  return getResults().filter((r) => r.tournamentId === tournamentId);
}

export function createRaceResult(
  tournamentId: string,
  data: { playerId: string; round: number; positions?: number[]; repickCount: number; group?: string; totalPoints?: number }
): RaceResult {
  const now = new Date().toISOString();
  const computedFromPositions = data.positions
    ? data.positions.reduce(
        (sum, pos) => sum + (PUNTOS_POR_POSICION[pos] || 0),
        0
      ) + data.repickCount * PENALIZACIONES.repickPista.puntos
    : 0;
  const result: RaceResult = {
    id: uuidv4(),
    tournamentId,
    playerId: data.playerId,
    round: data.round,
    positions: data.positions,
    repickCount: data.repickCount,
    group: data.group,
    totalPoints: data.totalPoints ?? computedFromPositions,
    createdAt: now,
    updatedAt: now,
  };
  const all = getResults();
  all.push(result);
  saveResults(all);
  return result;
}

export function getPlayerStandings(tournamentId: string): PlayerStanding[] {
  const teams = listTeams(tournamentId);
  const results = listRaceResults(tournamentId);
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const playerMap = new Map<string, PlayerStanding>();

  for (const team of teams) {
    playerMap.set(team.id, {
      playerId: team.id,
      playerName: team.name,
      playerShortName: team.shortName,
      playerColor: team.color,
      rounds: [],
      totalPoints: 0,
      penalizationPoints: 0,
      finalPoints: 0,
    });
  }

  const rounds = [...new Set(results.map((r) => r.round))].sort();

  for (const round of rounds) {
    const roundResults = results.filter((r) => r.round === round);
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
  standings.sort(
    (a, b) => b.finalPoints - a.finalPoints || b.totalPoints - a.totalPoints
  );

  return standings;
}

export function getStandings(tournamentId: string): Standing[] {
  const teams = listTeams(tournamentId);
  const matches = listMatches(tournamentId).filter(
    (m) => m.status === "completed"
  );
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const stats = new Map<
    string,
    {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
    }
  >();

  for (const team of teams) {
    stats.set(team.id, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  for (const match of matches) {
    const s1 = stats.get(match.team1Id);
    const s2 = stats.get(match.team2Id);
    if (!s1 || !s2 || match.score1 === null || match.score2 === null)
      continue;

    s1.played++;
    s2.played++;
    s1.goalsFor += match.score1;
    s1.goalsAgainst += match.score2;
    s2.goalsFor += match.score2;
    s2.goalsAgainst += match.score1;

    if (match.score1 > match.score2) {
      s1.won++;
      s2.lost++;
    } else if (match.score2 > match.score1) {
      s2.won++;
      s1.lost++;
    } else {
      s1.drawn++;
      s2.drawn++;
    }
  }

  const standings: Standing[] = [];
  for (const [teamId, s] of stats) {
    const team = teamMap.get(teamId);
    if (!team) continue;
    standings.push({
      teamId,
      teamName: team.name,
      teamShortName: team.shortName,
      teamColor: team.color,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalsFor - s.goalsAgainst,
      points: s.won * 3 + s.drawn,
    });
  }

  standings.sort(
    (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor
  );

  return standings;
}
