# AGENTS.md

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- No testing framework. Run: `npm run dev` (dev), `npm run build` (typecheck + lint + build)
- Config: `next.config.mjs` (`.ts` not supported by Next 14)

## Architecture

- **JSON file storage** in `lib/storage.ts` — reads/writes `data/*.json` locally, `/tmp/data` on Vercel
- Seed data (`lib/seed.ts`) auto-populates on first run when no files exist
- IDs generated via `uuid` v4

## Routes

| Route | Type | Behavior |
|---|---|---|
| `/` | Server | Calls `listTournaments()` directly from storage |
| `/tournaments` | Server | SSR list from storage |
| `/tournaments/new` | Client | Form → `POST /api/tournaments` |
| `/tournaments/[id]` | Client | Fetches via API, 3 tabs (standings/teams/matches) |
| `GET/POST /api/tournaments` | Route | List / Create |
| `GET/PUT/DELETE /api/tournaments/[id]` | Route | Read / Update / Delete (ID from params) |
| `GET/POST/PUT/DELETE /api/tournaments/[id]/teams` | Route | PUT/DELETE read ID from **request body** (not params) |
| `GET/POST/PUT/DELETE /api/tournaments/[id]/matches` | Route | PUT/DELETE read ID from **request body** (not params) |

> Teams and matches PUT/DELETE send `{ id }` in the JSON body rather than using `[teamId]`/`[matchId]` URL params.

## Conventions

- `@/` alias → project root (`paths: { "@/*": ["./*"] }`)
- `downlevelIteration: true` in tsconfig (required for `[...new Set(...)]` pattern)
- IDs stored as strings (not numbers)
- UI in Spanish (`lang="es"`), locale date format `"es"`
- Matches compute winnerId and status automatically when scores are set
- Standings sorting: points → goalDiff → goalsFor (all descending)
- `.gitignore` excludes: `node_modules`, `.next`, `data/`

## Vercel

- Deploy as standard Next.js project (no special config needed)
- Written JSON goes to `/tmp/data` — persists per instance only, resets on cold start
- Remove `&& process.env.VERCEL !== "1"` guard in `storage.ts:initData()` if you want seed data on Vercel

## MK8 Scoring System

Scoring constants in `constants/tournament.ts`. Standings computed client-side from `RaceResult` data (stored in `data/results.json` via `GET/POST /api/tournaments/[id]/results`).

### Points by position (`PUNTOS_POR_POSICION`)

- 1°=15, 2°=12, 3°=10, 4°=9, 5°=8, 6°=7, 7°=6, 8°=5, 9°=4, 10°=3, 11°=2, 12°=1
- La tabla completa de 12 posiciones se usa siempre, independientemente de cuantos jugadores haya en la sala. Si hay ≤12 jugadores, las posiciones no ocupadas simplemente no se asignan.

### Two-room format

Con >12 jugadores, cada fecha se divide en **2 salas/grupos** (≤12 cada una). Cada sala corre sus 12 carreras y asigna puntos segun la tabla de posiciones. La clasificacion general unifica los puntos de ambas salas.

### Penalties (`PENALIZACIONES`)

- **Repick de pista**: −7 pts per infraction

### Per-round calculation

```
Base Points = Σ PUNTOS_POR_POSICION[position] for each of 12 races
Penalty     = repickCount × (−7)
Final Points = Base Points + Penalty
```

### Data model (`RaceResult`)

```typescript
interface RaceResult {
  id: string; tournamentId: string; playerId: string;
  round: number; positions: number[]; // 12 elements
  repickCount: number; totalPoints: number;
  group?: string; // "A" | "B" — sala
}
```

### Standings (6 rounds)

Standings computed from intra-group position per round using `PUNTOS_POR_POSICION`:
- Each fecha, players are sorted by total race points within their sala
- Position 1 in sala → 15 pts, position 2 → 12 pts, etc.
- Final total = sum of position points across all 6 rounds
- Sorted by total position points descending
