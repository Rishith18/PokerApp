"use client"

import { cn } from "@/lib/utils"
import { GlassPanel } from "@/components/poker/glass-panel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { MatchSummary } from "@/lib/dashboard-types"
import { format, parseISO } from "date-fns"
import { Play, Trophy, XCircle } from "lucide-react"

interface RecentMatchesTableProps {
  matches: MatchSummary[]
  loading?: boolean
  emptyMessage?: string
}

export function RecentMatchesTable({
  matches,
  loading = false,
  emptyMessage = "No matches yet",
}: RecentMatchesTableProps) {
  if (loading) {
    return (
      <GlassPanel variant="default" className="p-6">
        <Skeleton className="mb-4 h-6 w-40 bg-white/[0.08]" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full bg-white/[0.08]" />
          ))}
        </div>
      </GlassPanel>
    )
  }

  if (!matches.length) {
    return (
      <GlassPanel variant="default" className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Recent matches
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel variant="default" className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Recent matches
      </h3>
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.08] hover:bg-transparent">
            <TableHead className="text-muted-foreground">Opponent</TableHead>
            <TableHead className="text-muted-foreground">Result</TableHead>
            <TableHead className="text-muted-foreground">BB</TableHead>
            <TableHead className="text-muted-foreground">Rating</TableHead>
            <TableHead className="text-muted-foreground">Time</TableHead>
            <TableHead className="w-10 text-muted-foreground" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => (
            <TableRow
              key={m.matchId}
              className="border-white/[0.08] hover:bg-white/[0.04]"
            >
              <TableCell className="font-medium text-foreground">
                {m.opponentName}
              </TableCell>
              <TableCell>
                {m.result === "win" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Trophy className="h-4 w-4" />
                    Win
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <XCircle className="h-4 w-4" />
                    Loss
                  </span>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  m.bbResult >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {m.bbResult >= 0 ? "+" : ""}
                {m.bbResult}
              </TableCell>
              <TableCell
                className={cn(
                  m.ratingDelta >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {m.ratingDelta >= 0 ? "+" : ""}
                {m.ratingDelta}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {format(parseISO(m.timestamp), "MMM d, HH:mm")}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.1] hover:text-foreground transition-colors"
                  aria-label="Replay"
                  onClick={() => {}}
                >
                  <Play className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </GlassPanel>
  )
}
