"use client"

import { cn } from "@/lib/utils"
import { GlassPanel } from "@/components/poker/glass-panel"
import { Skeleton } from "@/components/ui/skeleton"
import type { PerformanceSnapshot } from "@/lib/dashboard-types"
import { BarChart3, Zap, AlertTriangle, Layers } from "lucide-react"

interface PerformanceSnapshotProps {
  snapshot: PerformanceSnapshot | null
  loading?: boolean
}

const statCardBase =
  "rounded-xl border border-white/[0.12] bg-white/[0.06] p-4 backdrop-blur-sm"

export function PerformanceSnapshot({
  snapshot,
  loading = false,
}: PerformanceSnapshotProps) {
  if (loading) {
    return (
      <GlassPanel variant="default" className="p-6">
        <Skeleton className="mb-4 h-6 w-44 bg-white/[0.08]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={cn(statCardBase, "h-20")} />
          ))}
        </div>
      </GlassPanel>
    )
  }

  if (!snapshot) {
    return (
      <GlassPanel variant="default" className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Performance snapshot
        </h3>
        <p className="text-muted-foreground text-sm">No data</p>
      </GlassPanel>
    )
  }

  const cards = [
    {
      label: "VPIP",
      value: `${snapshot.vpip}%`,
      icon: BarChart3,
    },
    {
      label: "Aggression factor",
      value: snapshot.aggressionFactor.toFixed(1),
      icon: Zap,
    },
    {
      label: "Biggest leak",
      value: snapshot.biggestLeak,
      icon: AlertTriangle,
      fullWidth: true,
    },
    {
      label: "Hands played",
      value: snapshot.handsPlayed.toLocaleString(),
      icon: Layers,
    },
  ]

  return (
    <GlassPanel variant="default" className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Performance snapshot
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className={cn(
              statCardBase,
              c.fullWidth && "sm:col-span-2"
            )}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider-xl mb-1">
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </div>
            <p className="text-foreground font-semibold truncate">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
