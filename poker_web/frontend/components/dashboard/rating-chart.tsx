"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { cn } from "@/lib/utils"
import { GlassPanel } from "@/components/poker/glass-panel"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { RatingPoint } from "@/lib/dashboard-types"
import { format, subDays, parseISO } from "date-fns"

type TimeFilter = "7d" | "30d" | "all"

interface RatingChartProps {
  data: RatingPoint[]
  loading?: boolean
  height?: number
}

const chartConfig = {
  rating: {
    label: "Rating",
    color: "hsl(var(--chart-1))",
  },
  timestamp: {
    label: "Date",
  },
}

function filterByRange(data: RatingPoint[], range: TimeFilter): RatingPoint[] {
  if (range === "all") return data
  const now = new Date()
  const cutoff =
    range === "7d" ? subDays(now, 7) : subDays(now, 30)
  return data.filter((p) => parseISO(p.timestamp) >= cutoff)
}

export function RatingChart({
  data,
  loading = false,
  height = 280,
}: RatingChartProps) {
  const [range, setRange] = useState<TimeFilter>("30d")

  const filtered = useMemo(
    () => filterByRange(data, range),
    [data, range]
  )

  const chartData = useMemo(
    () =>
      filtered.map((p) => ({
        timestamp: p.timestamp,
        dateLabel: format(parseISO(p.timestamp), "MMM d"),
        rating: p.rating,
      })),
    [filtered]
  )

  if (loading) {
    return (
      <GlassPanel variant="default" className="p-6">
        <Skeleton className="mb-4 h-6 w-32 bg-white/[0.08]" />
        <Skeleton
          className="bg-white/[0.08]"
          style={{ height: `${height}px` }}
        />
      </GlassPanel>
    )
  }

  if (!data.length) {
    return (
      <GlassPanel variant="default" className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Rating progress
        </h3>
        <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: `${height}px` }}>
          No rating history yet
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel variant="default" className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Rating progress
          </h3>
          <div className="flex rounded-xl bg-white/[0.06] p-0.5 border border-white/[0.08]">
            {(["7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  range === r
                    ? "bg-[#0A84FF]/30 text-white border border-[#0A84FF]/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "all" ? "All time" : `Last ${r}`}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full" style={{ height: `${height}px` }}>
          <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="rating"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 20", "dataMax + 20"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload
                    return p?.timestamp
                      ? format(parseISO(p.timestamp), "PPp")
                      : ""
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--chart-1))" }}
            />
          </LineChart>
          </ChartContainer>
        </div>
      </div>
    </GlassPanel>
  )
}
