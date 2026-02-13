"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  getMockPlayer,
  getMockRatingHistory,
  getMockRecentMatches,
  getMockLeaderboard,
  getMockPerformanceSnapshot,
} from "@/lib/mock-dashboard-data"
import type { Player, RatingPoint, MatchSummary, LeaderboardEntry, PerformanceSnapshot } from "@/lib/dashboard-types"
import { PlayerHeader } from "@/components/dashboard/player-header"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RatingChart } from "@/components/dashboard/rating-chart"
import { RecentMatchesTable } from "@/components/dashboard/recent-matches-table"
import { PerformanceSnapshot as PerformanceSnapshotComponent } from "@/components/dashboard/performance-snapshot"
import { LeaderboardPreview } from "@/components/dashboard/leaderboard-preview"
import { ArrowLeft } from "lucide-react"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<Player | null>(null)
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([])
  const [recentMatches, setRecentMatches] = useState<MatchSummary[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [performance, setPerformance] = useState<PerformanceSnapshot | null>(null)

  useEffect(() => {
    const load = () => {
      setPlayer(getMockPlayer())
      setRatingHistory(getMockRatingHistory())
      setRecentMatches(getMockRecentMatches())
      setLeaderboard(getMockLeaderboard())
      setPerformance(getMockPerformanceSnapshot())
      setLoading(false)
    }
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
  }, [])

  const ratingChange =
    recentMatches.length > 0 ? recentMatches[0].ratingDelta : 0

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to game
          </Link>
        </div>

        <div className="space-y-6">
          <PlayerHeader
            player={player}
            loading={loading}
            ratingChange={ratingChange}
          />
          <QuickActions />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RatingChart data={ratingHistory} loading={loading} />
            <RecentMatchesTable matches={recentMatches} loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PerformanceSnapshotComponent
              snapshot={performance}
              loading={loading}
            />
            <LeaderboardPreview entries={leaderboard} loading={loading} />
          </div>
        </div>
      </div>
    </main>
  )
}
