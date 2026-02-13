"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { GlassPanel } from "./glass-panel"
import { PlayingCard } from "./playing-card"
import { PlayerArea } from "./player-area"
import { ActionBar } from "./action-bar"
import { Coins, RotateCcw } from "lucide-react"
import { usePokerGame, parseLegalActions } from "@/hooks/use-poker-game"

const SHOWDOWN_DELAY_MS = 3000

export function PokerTable() {
  const { gameState, isLoading, error, startNewHand, handlePlayerAction } = usePokerGame()
  const [showdownCountdown, setShowdownCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!gameState?.handOver) {
      setShowdownCountdown(null)
      return
    }
    const seconds = Math.ceil(SHOWDOWN_DELAY_MS / 1000)
    setShowdownCountdown(seconds)
    const id = setInterval(() => {
      setShowdownCountdown((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(id)
          startNewHand()
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [gameState?.handOver, startNewHand])

  if (!gameState) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gradient-to-b from-[#0a1628] via-[#0f1f3a] to-[#0a1628]" />
        <div className="relative z-10">
          <GlassPanel className="px-8 py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-white">Loading game...</p>
            </div>
          </GlassPanel>
        </div>
      </div>
    )
  }

  const legalActions = parseLegalActions(gameState.legalActions)

  const onAction = async (action: string, amount?: number) => {
    await handlePlayerAction(action, amount)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 gap-4 overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#0A84FF]/[0.06] rounded-full blur-[140px] animate-pulse-slow" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#1C4E80]/[0.06] rounded-full blur-[100px]" />

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 z-50">
          <GlassPanel className="px-4 py-3 bg-red-500/20 border-red-500/40">
            <p className="text-red-200 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-300 underline"
            >
              Reload
            </button>
          </GlassPanel>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 pointer-events-none">
          <GlassPanel className="px-6 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin w-8 h-8 rounded-full border-2 border-transparent border-t-[#0A84FF] border-r-[#0066CC] shadow-glow-blue" />
              <p className="text-white text-sm">Processing...</p>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center gap-5 w-full max-w-2xl">
        <GlassPanel variant="subtle" className="px-5 py-2.5 flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider-xl">Live</span>
        </GlassPanel>
        <GlassPanel variant="subtle" className="px-5 py-2.5 flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider-xl">Blinds</span>
          <span className="text-xs font-mono font-semibold text-foreground/90">
            {gameState.blinds.small}/{gameState.blinds.big}
          </span>
        </GlassPanel>
        <GlassPanel variant="subtle" className="px-5 py-2.5 flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider-xl">Wins</span>
          <span className="text-xs font-mono font-semibold text-foreground/90 whitespace-nowrap">
            You: {gameState.wins.player} | Bot: {gameState.wins.bot}
          </span>
        </GlassPanel>
        <div className="flex-1" />
        <button
          type="button"
          onClick={startNewHand}
          disabled={isLoading}
          className="relative overflow-hidden flex items-center gap-2 px-10 py-3.5 rounded-2xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white text-xs font-semibold tracking-wider-xl backdrop-blur-xl shadow-[0_4px_24px_rgba(10,132,255,0.4)] hover:bg-[#0A84FF]/40 hover:shadow-[0_6px_36px_rgba(10,132,255,0.6)] hover:scale-105 active:scale-95 transition-all ease-apple duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 rounded-2xl" />
          <RotateCcw className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10 whitespace-nowrap">New Hand</span>
        </button>
      </div>

      {/* Table */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Opponent Area */}
        <div className="flex justify-center mb-6">
          <PlayerArea
            name="Bot"
            chips={gameState.opponentChips}
            cards={gameState.opponentCards}
            isActive={!gameState.isPlayerTurn && !gameState.handOver}
            isCurrentUser={gameState.handOver}
            position="top"
            bet={gameState.opponentBet}
            isDealer={!gameState.isPlayerDealer}
            handLabel={gameState.opponentHandName ?? undefined}
            isWinner={gameState.winner === "bot" || gameState.winner === "split"}
          />
        </div>

        {/* Poker Table Surface */}
        <div className="relative mx-auto">
          {/* Table outer glow */}
          <div className="absolute inset-0 rounded-[48px] bg-[#2D5C3F]/20 blur-xl" />

          {/* Main table */}
          <div
            className={cn(
              "relative rounded-[48px] border-2 border-white/[0.12] overflow-hidden",
              "shadow-[0_0_80px_rgba(45,92,63,0.2),0_20px_60px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.08)]",
              "py-8 px-6"
            )}
            style={{
              background: 'radial-gradient(ellipse at center, #2D5C3F 0%, #1a3a28 100%)',
            }}
          >
            {/* Enhanced felt texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                filter: 'contrast(150%)',
              }}
            />

            {/* Vignette overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.3)] rounded-[48px] animate-vignette-pulse" />
            </div>

            {/* Top-light gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-transparent h-1/3 pointer-events-none" />

            {/* Inner table border */}
            <div className="absolute inset-3 rounded-[44px] border border-white/[0.06] pointer-events-none" />

            {/* Pot Display */}
            <div className="relative flex justify-center mb-6">
              <GlassPanel variant="elevated" shimmer className="px-6 py-3 animate-float">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-5 h-5 text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
                  <span className="text-xs text-white/70 uppercase tracking-wider-xl font-semibold">Pot</span>
                  <span className="text-xl font-mono font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300">
                    {gameState.pot.toLocaleString()}
                  </span>
                </div>
              </GlassPanel>
            </div>

            {/* Community Cards */}
            <div className="relative flex justify-center gap-3 md:gap-4">
              {gameState.communityCards.map((card, i) => (
                <PlayingCard key={i} card={card ?? undefined} delay={i * 150} flipReveal={!!card} />
              ))}
            </div>

            {/* Game Message */}
            <div className="relative flex justify-center mt-6">
              <div className="px-4 py-1.5 rounded-full bg-black/20 border border-white/[0.06]">
                <span className="text-xs text-white/60 font-medium">{gameState.message}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Player Area */}
        <div className="flex justify-center mt-6">
          <PlayerArea
            name="You"
            chips={gameState.playerChips}
            cards={gameState.playerCards}
            isActive={gameState.isPlayerTurn}
            isCurrentUser={true}
            position="bottom"
            bet={gameState.playerBet}
            isDealer={gameState.isPlayerDealer}
            handLabel={gameState.playerHandName ?? undefined}
            isWinner={gameState.winner === "player" || gameState.winner === "split"}
          />
        </div>
      </div>

      {/* Action Bar */}
      {gameState.isPlayerTurn && !gameState.handOver && (
        <div className="relative z-10 w-full max-w-lg">
          <ActionBar
            callAmount={gameState.callAmount}
            minRaise={legalActions.minRaise}
            maxRaise={Math.min(legalActions.maxRaise, gameState.playerChips)}
            playerChips={gameState.playerChips}
            pot={gameState.pot}
            onAction={onAction}
            canCheck={legalActions.canCheck}
          />
        </div>
      )}

      {/* Showdown: countdown and optional early Deal New Hand */}
      {gameState.handOver && (
        <div className="relative z-10 flex flex-col items-center gap-2">
          {showdownCountdown != null && showdownCountdown > 0 && (
            <p className="text-xs text-white/60">Next hand in {showdownCountdown}…</p>
          )}
          <button
            type="button"
            onClick={startNewHand}
            disabled={isLoading}
            className="relative overflow-hidden px-10 py-3.5 rounded-2xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white text-xs font-semibold tracking-wider-xl backdrop-blur-xl shadow-[0_4px_24px_rgba(10,132,255,0.4)] hover:bg-[#0A84FF]/40 hover:shadow-[0_6px_36px_rgba(10,132,255,0.6)] hover:scale-105 active:scale-95 transition-all ease-apple duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 rounded-2xl" />
            <span className="relative whitespace-nowrap">Deal New Hand</span>
          </button>
        </div>
      )}
    </div>
  )
}
