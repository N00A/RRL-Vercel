export type Player = {
  id: string
  name: string
  groupId: string
  botCount: number
}

export type RaceResultPosition = {
  playerId: string
  position: number
  mkPoints: number
  lateEntry?: boolean
}

export type RaceResult = {
  raceNumber: number
  trackId?: string
  positions: RaceResultPosition[]
}

export type Penalty = {
  playerId: string
  amount: number
  reason: string
  raceNumber?: number
}

export type GroupRanking = {
  playerId: string
  position: 1 | 2 | 3 | 4
  totalMkPoints: number
  groupPoints: number
}

export type GroupStage = {
  groupId: string
  date: string
  players: Player[]
  races: RaceResult[]
  finalRanking?: GroupRanking[]
  interrupted?: boolean
  validRaces?: number
  penalties?: Penalty[]
}

export type Bracket = {
  bracketId: string
  player1Id: string
  player2Id: string
  winnerId?: string
}

export type EliminationRoom = {
  roomId: string
  phase: "R16" | "QF" | "SF" | "F"
  brackets: [Bracket, Bracket]
  participants?: string[]
  freeForAll?: boolean
  racePositions?: { playerId: string; position: number; mkPoints?: number }[]
  completed: boolean
  penalties?: Penalty[]
}

export type BestThird = {
  playerId: string
  groupId: string
  groupPoints: number
  totalMkPoints: number
  botCount: number
  rankPosition?: number
}

export type TournamentState = {
  phase: "GROUPS" | "R16" | "QF" | "SF" | "F" | "DONE"
  groups: GroupStage[]
  bestThirds?: BestThird[]
  eliminationRooms: EliminationRoom[]
  players: Player[]
  podium?: {
    first: string
    second: string
    third: string
  }
}
