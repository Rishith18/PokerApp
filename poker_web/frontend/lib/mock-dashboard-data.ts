import type {
  Player,
  MatchSummary,
  RatingPoint,
  LeaderboardEntry,
  PerformanceSnapshot,
} from "./dashboard-types"

const NOW = new Date()
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export function getMockPlayer(): Player {
  return {
    id: "user-mock-1",
    username: "PokerPro",
    rating: 1247,
    gamesPlayed: 156,
    wins: 89,
    losses: 67,
    createdAt: new Date(NOW.getTime() - 180 * NINETY_DAYS_MS / 90).toISOString(),
    rankPercentile: 72,
  }
}

export function getMockRatingHistory(): RatingPoint[] {
  const points: RatingPoint[] = []
  const baseRating = 1100
  const startTime = NOW.getTime() - NINETY_DAYS_MS
  const stepMs = NINETY_DAYS_MS / 99

  for (let i = 0; i < 100; i++) {
    const t = startTime + i * stepMs
    const progress = i / 99
    const trend = baseRating + progress * 200
    const variance = Math.sin(i * 0.3) * 25 + ((i % 7) - 3) * 8
    points.push({
      timestamp: new Date(t).toISOString(),
      rating: Math.round(Math.max(800, Math.min(1600, trend + variance))),
    })
  }
  return points
}

const MOCK_OPPONENTS = [
  "RiverShark",
  "AceHigh",
  "BluffMaster",
  "ChipLeader",
  "AllInAnnie",
  "TightPlayer",
  "LAG_King",
  "CallStation",
  "NitWit",
  "SharkBait",
]

export function getMockRecentMatches(): MatchSummary[] {
  const matches: MatchSummary[] = []
  for (let i = 0; i < 10; i++) {
    const result: MatchSummary["result"] = i % 3 === 0 ? "loss" : "win"
    const bbResult = result === "win" ? 12 + i * 2 : -(8 + i)
    const ratingDelta = result === "win" ? 8 + (i % 6) : -(6 + (i % 4))
    matches.push({
      matchId: `match-${1000 - i}`,
      opponentName: MOCK_OPPONENTS[i],
      result,
      bbResult,
      ratingDelta,
      timestamp: new Date(NOW.getTime() - (i + 1) * 2 * 60 * 60 * 1000).toISOString(),
    })
  }
  return matches
}

export function getMockLeaderboard(): LeaderboardEntry[] {
  return [
    { rank: 1, username: "EliteGrinder", rating: 1842 },
    { rank: 2, username: "CardSharp", rating: 1791 },
    { rank: 3, username: "BluffKing", rating: 1723 },
    { rank: 4, username: "ChipBoss", rating: 1688 },
    { rank: 5, username: "RiverLord", rating: 1654 },
  ]
}

export function getMockPerformanceSnapshot(): PerformanceSnapshot {
  return {
    vpip: 24,
    aggressionFactor: 2.4,
    biggestLeak: "Overfolding on river",
    handsPlayed: 3420,
  }
}
