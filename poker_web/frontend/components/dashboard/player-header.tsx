"use client"

import { cn } from "@/lib/utils"
import { GlassPanel } from "@/components/poker/glass-panel"
import { Skeleton } from "@/components/ui/skeleton"
import type { Player } from "@/lib/dashboard-types"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PlayerHeaderProps {
  player: Player | null
  loading?: boolean
  ratingChange?: number
}

export function PlayerHeader({
  player,
  loading = false,
  ratingChange = 0,
}: PlayerHeaderProps) {
  if (loading) {
    return (
      <GlassPanel variant="prominent" className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48 bg-white/[0.08]" />
            <Skeleton className="h-6 w-20 bg-white/[0.08]" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-5 w-24 bg-white/[0.08]" />
            <Skeleton className="h-5 w-28 bg-white/[0.08]" />
            <Skeleton className="h-5 w-32 bg-white/[0.08]" />
          </div>
        </div>
      </GlassPanel>
    )
  }

  if (!player) {
    return (
      <GlassPanel variant="prominent" className="p-6">
        <p className="text-muted-foreground text-sm">No player data</p>
      </GlassPanel>
    )
  }

  const winRate =
    player.gamesPlayed > 0
      ? Math.round((player.wins / player.gamesPlayed) * 100)
      : 0

  const RatingIndicator = () => {
    if (ratingChange > 0)
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          +{ratingChange}
        </span>
      )
    if (ratingChange < 0)
      return (
        <span className="inline-flex items-center gap-1 text-red-400 text-sm font-medium">
          <TrendingDown className="h-4 w-4" />
          {ratingChange}
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
        <Minus className="h-4 w-4" />
        0
      </span>
    )
  }

  return (
    <GlassPanel variant="prominent" className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {player.username}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              Rank / percentile:{" "}
              {player.rankPercentile != null
                ? `Top ${100 - player.rankPercentile}%`
                : "—"}
            </span>
            <span>{player.gamesPlayed} games</span>
            <span>{winRate}% win rate</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider-xl text-muted-foreground">
              Rating
            </p>
            <p className="text-2xl font-bold text-foreground">{player.rating}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider-xl text-muted-foreground">
              Last change
            </p>
            <RatingIndicator />
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
