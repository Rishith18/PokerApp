"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

type Suit = "hearts" | "diamonds" | "clubs" | "spades"
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K"

export interface CardData {
  suit: Suit
  rank: Rank
}

const suitSymbols: Record<Suit, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
}

const suitColors: Record<Suit, string> = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-black",
  spades: "text-black",
}

function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#1C4E80] via-[#0a2a4a] to-[#051628] border border-white/30 shadow-card-float flex items-center justify-center overflow-hidden"
      style={{ backfaceVisibility: "hidden" as const, transform: "rotateY(0deg)" }}
    >
      <div className="absolute inset-1 rounded-lg border border-white/10" />
      <div
        className="w-full h-full opacity-30 absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.1) 3px,
            rgba(255,255,255,0.1) 6px
          ),
          repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.05) 3px,
            rgba(255,255,255,0.05) 6px
          )`,
        }}
      />
      <span className="text-2xl text-white/40 drop-shadow-md relative z-10" aria-hidden>
        &#9824;
      </span>
    </div>
  )
}

function CardFront({ card }: { card: CardData }) {
  return (
    <div
      className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-white/95 backdrop-blur-sm border border-white/40 shadow-card-float flex flex-col justify-between p-1.5 md:p-2 overflow-hidden"
      style={{ backfaceVisibility: "hidden" as const, transform: "rotateY(180deg)" }}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className={cn("relative flex items-center gap-0.5 text-xs md:text-sm font-bold", suitColors[card.suit])}>
        <span>{card.rank}</span>
        <span className="text-[10px] md:text-xs">{suitSymbols[card.suit]}</span>
      </div>
      <div className={cn("relative text-2xl md:text-3xl self-center", suitColors[card.suit])}>
        {suitSymbols[card.suit]}
      </div>
      <div className={cn("relative flex items-center gap-0.5 text-xs md:text-sm font-bold self-end rotate-180", suitColors[card.suit])}>
        <span>{card.rank}</span>
        <span className="text-[10px] md:text-xs">{suitSymbols[card.suit]}</span>
      </div>
    </div>
  )
}

interface PlayingCardProps {
  card?: CardData
  faceDown?: boolean
  className?: string
  delay?: number
  flipReveal?: boolean
}

export function PlayingCard({ card, faceDown = false, className, delay = 0, flipReveal = false }: PlayingCardProps) {
  const [hasFlipped, setHasFlipped] = useState(false)

  useEffect(() => {
    if (!flipReveal || !card) return
    const t = setTimeout(() => setHasFlipped(true), delay + 500)
    return () => clearTimeout(t)
  }, [flipReveal, card, delay])

  if (!card && !faceDown) return <EmptySlot className={className} />

  if (flipReveal && card) {
    return (
      <div
        className={cn(
          "relative w-[56px] h-[80px] md:w-[68px] md:h-[96px] rounded-xl select-none animate-card-deal",
          "hover:scale-110 hover:-translate-y-2 hover:rotate-1 hover:shadow-card-float-hover",
          className
        )}
        style={{ animationDelay: `${delay}ms`, perspective: "1000px" }}
      >
        <div
          className={cn(
            "relative w-full h-full rounded-xl",
            "transition-all duration-300 ease-apple",
            hasFlipped && "card-flip-reveal"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          <CardBack />
          <CardFront card={card} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative w-[56px] h-[80px] md:w-[68px] md:h-[96px] rounded-xl select-none animate-card-deal",
        "transition-all duration-300 ease-apple",
        "hover:scale-110 hover:-translate-y-2 hover:rotate-1 hover:shadow-card-float-hover",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {faceDown ? (
        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-[#1C4E80] via-[#0a2a4a] to-[#051628] border border-white/30 shadow-card-float flex items-center justify-center overflow-hidden">
          <div className="absolute inset-1 rounded-lg border border-white/10" />
          <div
            className="w-full h-full opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.1) 3px,
                rgba(255,255,255,0.1) 6px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.05) 3px,
                rgba(255,255,255,0.05) 6px
              )`,
            }}
          />
        </div>
      ) : card ? (
        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-white to-white/95 backdrop-blur-sm border border-white/40 shadow-card-float flex flex-col justify-between p-1.5 md:p-2 overflow-hidden">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className={cn("relative flex items-center gap-0.5 text-xs md:text-sm font-bold", suitColors[card.suit])}>
            <span>{card.rank}</span>
            <span className="text-[10px] md:text-xs">{suitSymbols[card.suit]}</span>
          </div>
          <div className={cn("relative text-2xl md:text-3xl self-center", suitColors[card.suit])}>
            {suitSymbols[card.suit]}
          </div>
          <div className={cn("relative flex items-center gap-0.5 text-xs md:text-sm font-bold self-end rotate-180", suitColors[card.suit])}>
            <span>{card.rank}</span>
            <span className="text-[10px] md:text-xs">{suitSymbols[card.suit]}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EmptySlot({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[56px] h-[80px] md:w-[68px] md:h-[96px] rounded-xl",
        "border-2 border-dashed border-white/[0.15] bg-white/[0.03] backdrop-blur-sm",
        className
      )}
    />
  )
}
