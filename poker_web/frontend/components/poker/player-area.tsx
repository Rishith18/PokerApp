"use client"

import { cn } from "@/lib/utils"
import { GlassPanel } from "./glass-panel"
import { PlayingCard, type CardData } from "./playing-card"
import { Coins, User } from "lucide-react"

interface PlayerAreaProps {
  name: string
  chips: number
  cards: (CardData | null)[]
  isActive: boolean
  isCurrentUser: boolean
  position: "top" | "bottom"
  bet?: number
  isDealer?: boolean
  avatar?: string
}

export function PlayerArea({
  name,
  chips,
  cards,
  isActive,
  isCurrentUser,
  position,
  bet = 0,
  isDealer = false,
}: PlayerAreaProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4",
        position === "top" && "flex-col",
        position === "bottom" && "flex-col-reverse"
      )}
    >
      {/* Cards */}
      <div className="flex gap-2">
        {cards.map((card, i) => (
          <PlayingCard
            key={i}
            card={card ?? undefined}
            faceDown={!isCurrentUser && !!card}
            delay={i * 100}
            flipReveal={!!card && isCurrentUser}
          />
        ))}
      </div>

      {/* Player Info */}
      <GlassPanel glow={isActive} className="px-5 py-2.5 flex items-center gap-4 min-w-[200px]">
        {/* Avatar */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
            "bg-gradient-to-br from-[#007AFF]/30 to-[#1C4E80]/40 border border-white/20",
            isActive && "ring-2 ring-[#007AFF]/60"
          )}
        >
          <User className="w-5 h-5 text-foreground/80" />
        </div>

          {/* Name & Chips */}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground/90 truncate">{name}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="w-3.5 h-3.5 text-[#FFB800]" />
              <span className="font-mono">{chips.toLocaleString()}</span>
            </div>
          </div>

        {/* Dealer Button */}
        {isDealer && (
          <div
            className="ml-auto shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-glow-gold border border-[#FFE55C]/40 animate-pulse-slow"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            <span className="text-[10px] font-bold text-[#1a1a1a]">D</span>
          </div>
        )}
      </GlassPanel>

      {/* Bet Amount */}
      {bet > 0 && (
        <GlassPanel variant="prominent" className="flex items-center gap-2 px-4 py-1.5">
          <Coins className="w-3.5 h-3.5 text-[#FFB800] drop-shadow-[0_0_4px_rgba(255,184,0,0.4)]" />
          <span className="text-xs font-mono font-semibold text-foreground/80">{bet.toLocaleString()}</span>
        </GlassPanel>
      )}
    </div>
  )
}
