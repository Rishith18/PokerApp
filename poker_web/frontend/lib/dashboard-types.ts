/**
 * TypeScript types for the user dashboard.
 * Used by mock data and future API responses.
 */

export interface Player {
  id: string
  username: string
  rating: number
  gamesPlayed: number
  wins: number
  losses: number
  createdAt: string // ISO date string
  rankPercentile?: number
}

export type MatchResult = "win" | "loss"

export interface MatchSummary {
  matchId: string
  opponentName: string
  result: MatchResult
  bbResult: number
  ratingDelta: number
  timestamp: string // ISO date string
}

export interface RatingPoint {
  timestamp: string // ISO date string
  rating: number
}

export interface LeaderboardEntry {
  rank: number
  username: string
  rating: number
}

export interface PerformanceSnapshot {
  vpip: number
  aggressionFactor: number
  biggestLeak: string
  handsPlayed: number
}
