"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { GlassPanel } from "./glass-panel"
import { Minus, Plus } from "lucide-react"

interface ActionBarProps {
  callAmount: number
  minRaise: number
  maxRaise: number
  playerChips: number
  pot: number
  onAction: (action: string, amount?: number) => void
  canCheck: boolean
}

export function ActionBar({
  callAmount,
  minRaise,
  maxRaise,
  playerChips,
  pot,
  onAction,
  canCheck,
}: ActionBarProps) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise)
  const [showRaise, setShowRaise] = useState(false)

  const handleRaiseChange = (value: number) => {
    setRaiseAmount(Math.min(Math.max(value, minRaise), maxRaise))
  }

  const raisePercentage =
    maxRaise > minRaise ? ((raiseAmount - minRaise) / (maxRaise - minRaise)) * 100 : 100

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* Raise Slider */}
      {showRaise && (
        <GlassPanel variant="prominent" className="w-full px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider-xl font-semibold">Raise Amount</span>
            <span className="text-lg font-mono font-semibold text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              {raiseAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleRaiseChange(raiseAmount - 10)}
              className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-foreground/70 hover:bg-white/[0.15] hover:scale-105 active:scale-95 transition-all ease-apple duration-200"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 relative h-8 flex items-center">
              {/* Track background */}
              <div className="absolute w-full h-2 rounded-full bg-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" />
              {/* Filled portion */}
              <div
                className="absolute h-2 rounded-full bg-gradient-to-r from-[#0A84FF] via-[#0088FF] to-[#00A2FF] shadow-glow-blue"
                style={{ width: `${raisePercentage}%` }}
              />
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={(e) => handleRaiseChange(Number(e.target.value))}
                className="absolute w-full h-8 opacity-0 cursor-pointer z-10"
              />
              {/* Slider thumb */}
              <div
                className="absolute w-6 h-6 rounded-full border-2 border-white/60 shadow-[0_0_16px_rgba(0,122,255,0.6),0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_24px_rgba(0,122,255,0.8),0_4px_12px_rgba(0,0,0,0.4)] transition-shadow duration-200"
                style={{
                  left: `calc(${raisePercentage}% - 12px)`,
                  background: 'linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleRaiseChange(raiseAmount + 10)}
              className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-foreground/70 hover:bg-white/[0.15] hover:scale-105 active:scale-95 transition-all ease-apple duration-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Quick bet buttons */}
          <div className="flex gap-2">
            {[
              { label: "Min", value: minRaise },
              {
                label: "1/2 Pot",
                value: Math.max(minRaise, Math.min(maxRaise, Math.floor(0.5 * pot))),
              },
              {
                label: "Pot",
                value: Math.max(minRaise, Math.min(maxRaise, Math.floor(pot))),
              },
              { label: "All In", value: maxRaise },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleRaiseChange(preset.value)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider-xl transition-all ease-apple duration-200",
                  "hover:scale-105 active:scale-95",
                  raiseAmount === preset.value
                    ? "bg-[#0A84FF]/30 text-[#0A84FF] border border-[#0A84FF]/50 shadow-glow-blue"
                    : "bg-white/[0.05] text-foreground/50 border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground/70"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2.5 w-full">
        <ActionButton
          label="Fold"
          variant="danger"
          onClick={() => {
            setShowRaise(false)
            onAction("fold")
          }}
        />
        {canCheck ? (
          <ActionButton
            label="Check"
            variant="secondary"
            onClick={() => {
              setShowRaise(false)
              onAction("check")
            }}
          />
        ) : (
          <ActionButton
            label={`Call ${callAmount}`}
            variant="secondary"
            onClick={() => {
              setShowRaise(false)
              onAction("call", callAmount)
            }}
          />
        )}
        <ActionButton
          label={showRaise ? `Raise ${raiseAmount}` : "Raise"}
          variant="primary"
          onClick={() => {
            if (showRaise) {
              onAction("raise", raiseAmount)
              setShowRaise(false)
            } else {
              setShowRaise(true)
            }
          }}
        />
      </div>
    </div>
  )
}

function ActionButton({
  label,
  variant,
  onClick,
}: {
  label: string
  variant: "primary" | "secondary" | "danger"
  onClick: () => void
}) {
  if (variant === "primary") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative overflow-hidden flex-1 py-3.5 px-5 rounded-2xl text-sm font-semibold uppercase tracking-wider-xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white backdrop-blur-xl shadow-[0_4px_20px_rgba(10,132,255,0.3)] hover:bg-[#0A84FF]/40 hover:shadow-[0_6px_32px_rgba(10,132,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all ease-apple duration-200 group"
      >
        <span className="relative z-10">{label}</span>
      </button>
    )
  }

  if (variant === "danger") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-1 py-3.5 px-5 rounded-2xl text-sm font-semibold uppercase tracking-wider-xl bg-gradient-to-br from-[#8B4545] to-[#6B3434] border border-[#8B4545]/40 text-red-200 shadow-[0_4px_16px_rgba(139,69,69,0.2)] hover:from-[#9B5555] hover:to-[#7B4444] hover:scale-[1.02] active:scale-[0.98] transition-all ease-apple duration-200"
      >
        {label}
      </button>
    )
  }

  // Secondary variant (CHECK/CALL)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-3.5 px-5 rounded-2xl text-sm font-semibold uppercase tracking-wider-xl bg-white/[0.1] border border-white/[0.18] text-foreground/90 backdrop-blur-xl shadow-glass hover:bg-white/[0.15] hover:scale-[1.02] active:scale-[0.98] transition-all ease-apple duration-200"
    >
      {label}
    </button>
  )
}
