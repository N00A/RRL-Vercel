# AGENTS.md

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS 3**
- Commands: `npm run dev` (dev), `npm run build` (build + typecheck only), `npm run lint` (separate)
- Config: `next.config.mjs` (`.ts` not supported by Next 14)
- Custom Tailwind colors: `navy`/`navy-light`, `rojo`, `dorado`, `verde`

## Architecture

- **JSON file storage** in `lib/storage.ts` — reads/writes `data/*.json` locally, `/tmp/data` on Vercel (`process.env.VERCEL === "1"`).
- No seed data — `data/*.json` files tracked by git, deployed to Vercel.
- IDs via `uuid` v4. `@/` alias → project root.
- `downlevelIteration: true` in tsconfig (required for `[...new Set(...)]` pattern).
- UI in Spanish (`lang="es"`), locale date format `"es"`.

## Routes

| Route | Type | Behavior |
|---|---|---|
| `/` | Server | Dashboard — `listTournaments()` from storage |
| `/tournaments` | Server | SSR list from storage |
| `/tournaments/[id]` | Client | Fetches via API, 4 tabs: info/standings/players/matches |
| `GET/POST /api/tournaments` | Route | List / Create |
| `GET/PUT/DELETE /api/tournaments/[id]` | Route | Read / Update / Delete (ID from params) |
| `GET/POST/PUT/DELETE /api/tournaments/[id]/teams` | Route | PUT/DELETE read ID from **request body** `{ id }`, not URL params |
| `GET/POST/PUT/DELETE /api/tournaments/[id]/matches` | Route | PUT/DELETE read ID from **request body** `{ id }`, not URL params |
| `GET/POST /api/tournaments/[id]/results` | Route | Race results — **no PUT/DELETE** |

> Teams and matches PUT/DELETE send `{ id }` in JSON body rather than URL params.

## Conventions

- IDs stored as strings (not numbers)
- Matches compute `winnerId` and `status` automatically when scores are set in `updateMatch()` (lib/storage.ts:222-234)
- MK8 detection: `tournament.name.includes("MK8")` toggles between football standings (Standing) and MK8 standings (PlayerStanding)
- Standings sorting: points → goalDiff → goalsFor (all descending)
- `RaceResult.positions` is optional (`positions?: number[]`), not always 12 elements
- `.gitignore`: `node_modules`, `.next`

## MK8 Scoring System

Scoring constants in `constants/tournament.ts` — `PUNTOS_POR_POSICION`, `PENALIZACIONES`, `DIVISION_2_CONFIG`, `LEAGUE_CONFIG`.

### Points by position

1°=15, 2°=12, 3°=10, 4°=9, 5°=8, 6°=7, 7°=6, 8°=5, 9°=4, 10°=3, 11°=2, 12°=1. Full table always used; unoccupied positions not assigned.

### Two-room format

With >12 players, each round splits into **2 rooms** (≤12 each). Each room runs 12 races. Overall standings unify points from both rooms.

### Penalties

**Repick**: −7 pts per infraction (`PENALIZACIONES.repickPista.puntos`)

### Per-round calculation

```
Base Points = Σ PUNTOS_POR_POSICION[position] for each of 12 races
Penalty     = repickCount × (−7)
Final Points = Base Points + Penalty
```

### Standings (6 rounds)

Per round, players sorted by total race points within their sala. Position 1 in sala → 15 pts, position 2 → 12 pts, etc. Final = sum of position points across all 6 rounds, sorted descending.

## Vercel

- Standard Next.js deploy. `data/` folder tracked by git — JSON files persist on Vercel.
- Written JSON goes to `/tmp/data` on Vercel — persists per instance only, resets on cold start.
