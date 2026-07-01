import fs from "fs/promises";
import path from "path";
import type { TournamentState } from "@/types/tournament";

const isVercel = process.env.VERCEL === "1";

const WRITE_DIR = isVercel ? "/tmp/data" : path.join(process.cwd(), "data");
const FILENAME = "tournament.json";

async function ensureTmpDir(): Promise<void> {
  try {
    await fs.mkdir(WRITE_DIR, { recursive: true });
  } catch {
    // dir already exists
  }
}

export async function readTournament(): Promise<TournamentState> {
  const writePath = path.join(WRITE_DIR, FILENAME);

  try {
    const raw = await fs.readFile(writePath, "utf-8");
    return JSON.parse(raw) as TournamentState;
  } catch {
    // fallback to seed file
    const seedPath = path.join(process.cwd(), "data", FILENAME);
    const raw = await fs.readFile(seedPath, "utf-8");
    const state = JSON.parse(raw) as TournamentState;

    await ensureTmpDir();
    await fs.writeFile(writePath, JSON.stringify(state, null, 2), "utf-8");
    return state;
  }
}

export async function writeTournament(state: TournamentState): Promise<void> {
  await ensureTmpDir();
  const writePath = path.join(WRITE_DIR, FILENAME);
  await fs.writeFile(writePath, JSON.stringify(state, null, 2), "utf-8");
}

export { ensureTmpDir };
