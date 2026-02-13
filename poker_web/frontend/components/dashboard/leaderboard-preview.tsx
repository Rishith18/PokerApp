"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { GlassPanel } from "@/components/poker/glass-panel"
import { Skeleton } from "@/components/ui/skeleton"
import type { LeaderboardEntry } from "@/lib/dashboard-types"
import { Medal, ChevronRight } from "lucide-react"

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[]
  loading?: boolean
}

const rankColors: Record<number, string> = {
  1: "text-amber-400",
  2: "text-slate-300",
  3: "text-amber-600",
}

export function LeaderboardPreview({
  entries,
  loading = false,
}: LeaderboardPreviewProps) {
  if (loading) {
    return (
      <GlassPanel variant="default" className="p-6">
        <Skeleton className="mb-4 h-6 w-36 bg-white/[0.08]" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/[0.08]" />
          ))}
        </div>
        <Skeleton className="mt-4 h-10 w-full bg-white/[0.08]" />
      </GlassPanel>
    )
  }

  return (
    <GlassPanel variant="default" className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Leaderboard
      </h3>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No entries</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.rank}
              className="flex items-center justify-between rounded-lg py-2 px-3 bg-white/[0.04] border border-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "font-bold tabular-nums w-6 flex items-center gap-1",
                    rankColors[e.rank] ?? "text-muted-foreground"
                  )}
                >
                  {e.rank === 1 && <Medal className="h-4 w-4 text-amber-400 shrink-0" />}
                  {e.rank}
                </span>
                <span className="font-medium text-foreground truncate">
                  {e.username}
                </span>
              </div>
              <span className="text-muted-foreground font-mono text-sm tabular-nums">
                {e.rating}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/leaderboard"
        className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-medium text-foreground hover:bg-white/[0.12] transition-colors"
      >
        View Full Leaderboard
        <ChevronRight className="h-4 w-4" />
      </Link>
    </GlassPanel>
  )
}
