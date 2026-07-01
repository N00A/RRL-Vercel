# AGENTS.md

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS 3**
- Commands: `npm run dev` (dev), `npm run build` (build + typecheck), `npm run lint` (separate). No test runner exists.
- Config: `next.config.mjs` (`.ts` not supported by Next 14)
- Custom Tailwind colors: `navy`/`navy-light`, `rojo`, `dorado`, `verde`

## Architecture

- **JSON file storage** in `lib/storage.ts` — reads/writes `data/*.json` locally, `/tmp/data` on Vercel (`process.env.VERCEL === "1"`).
- `data/*.json` are **committed seed files** — used as fallback on Vercel cold starts, and as initial data locally when no write dir file exists.
- IDs via `uuid` v4. `@/` alias → project root.
- `downlevelIteration: true` in tsconfig (required for `[...new Set(...)]` pattern).
- UI in Spanish (`lang="es"`), locale date format `"es"`.
- All data shapes defined in `lib/types.ts` — `Tournament`, `Team`, `Match`, `RaceResult`, `PlayerStanding`, `Standing`, and form-data types.

## Routes

| Route | Type | Behavior |
|---|---|---|
| `/` | Server | Dashboard |
| `/tournaments` | Server | SSR list |
| `/tournaments/[id]` | Client | Fetches via API, 4 tabs: info/standings/players/matches |
| `GET/POST /api/tournaments` | Route | List / Create |
| `GET/PUT/DELETE /api/tournaments/[id]` | Route | Read / Update / Delete (ID from params) |
| `GET/POST/PUT/DELETE /api/tournaments/[id]/teams` | Route | **PUT/DELETE read ID from request body `{ id }`**, not URL params |
| `GET/POST/PUT/DELETE /api/tournaments/[id]/matches` | Route | **PUT/DELETE read ID from request body `{ id }`**, not URL params |
| `GET/POST /api/tournaments/[id]/results` | Route | Race results — **no PUT/DELETE** |

## Conventions

- IDs stored as strings (not numbers)
- Matches compute `winnerId` and `status` automatically when scores are set in `updateMatch()` (lib/storage.ts:222-234)
- MK8 detection: `tournament.name.includes("MK8")` toggles between football standings (`Standing`) and MK8 standings (`PlayerStanding`)
- Standings sorting: points → goalDiff → goalsFor (all descending)
- `RaceResult.positions` is optional (`positions?: number[]`)
- `PlayerStanding` computation duplicated in both `lib/storage.ts:279` and `app/tournaments/[id]/page.tsx` (client-side)
- `createRaceResult()` auto-computes `totalPoints` from positions + repick penalties

## MK8 Scoring System

Scoring constants in `constants/tournament.ts`. Key structural points:

- **6 rounds** per tournament. With >12 players, each round splits into **2 rooms** (≤12 each), each running 12 races.
- **Per-round**: players sorted by race points within their sala. Position 1 in sala → 15 pts, position 2 → 12 pts, etc. (full 12-position table). Final = sum of position points across all 6 rounds, sorted descending.
- **Penalties**: repick = −7 pts per infraction (`PENALIZACIONES.repickPista.puntos`).

## Vercel

- Standard Next.js deploy. `data/` tracked by git — JSON files persist on Vercel.
- Writes go to `/tmp/data` on Vercel — per-instance only, resets on cold start (falls back to git-tracked files).
