"use client"

import { cn } from "@/lib/utils"
import { GlassPanel } from "./glass-panel"
import { PlayingCard } from "./playing-card"
import { PlayerArea } from "./player-area"
import { ActionBar } from "./action-bar"
import { Coins } from "lucide-react"
import { parseLegalActions } from "@/hooks/use-poker-game"
import type { ReactGameState } from "@/lib/types"

interface PokerTableMultiplayerProps {
  gameState: ReactGameState
  onAction: (action: string, amount?: number) => void
  isLoading?: boolean
  error: string | null
  matchEndReason: string | null
  opponentReconnectSeconds: number | null
  onBackToLobby: () => void
  connected: boolean
}

export function PokerTableMultiplayer({
  gameState,
  onAction,
  isLoading,
  error,
  matchEndReason,
  opponentReconnectSeconds,
  onBackToLobby,
  connected,
}: PokerTableMultiplayerProps) {
  const legalActions = parseLegalActions(gameState.legalActions)

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 gap-4 overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#0A84FF]/[0.06] rounded-full blur-[140px] animate-pulse-slow" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#1C4E80]/[0.06] rounded-full blur-[100px]" />

      {error && (
        <div className="fixed top-4 right-4 z-50">
          <GlassPanel className="px-4 py-3 bg-red-500/20 border-red-500/40">
            <p className="text-red-200 text-sm">{error}</p>
          </GlassPanel>
        </div>
      )}

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

      <div className="relative z-10 flex items-center gap-5 w-full max-w-2xl">
        <GlassPanel variant="subtle" className="px-5 py-2.5 flex items-center gap-2.5">
          <div className={cn("w-2.5 h-2.5 rounded-full", connected ? "bg-emerald-400" : "bg-amber-400")} />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider-xl">
            {connected ? "Connected" : "Reconnecting…"}
          </span>
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
            You: {gameState.wins.player} | Opponent: {gameState.wins.bot}
          </span>
        </GlassPanel>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onBackToLobby}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 border border-white/20 text-foreground/90 hover:bg-white/15 transition-colors"
        >
          Leave game
        </button>
      </div>

      {opponentReconnectSeconds !== null && opponentReconnectSeconds > 0 ? (
        <div className="relative z-10 text-center">
          <GlassPanel className="px-6 py-4 inline-block">
            <p className="text-white/90">Opponent disconnected. Waiting {opponentReconnectSeconds}s…</p>
          </GlassPanel>
        </div>
      ) : matchEndReason ? (
        <div className="relative z-10 text-center space-y-4">
          <GlassPanel className="px-8 py-6 max-w-md">
            <p className="text-white font-medium">
              {matchEndReason === "opponent_left" ? "Opponent left the game." : "Match ended."}
            </p>
            <button
              type="button"
              onClick={onBackToLobby}
              className="mt-4 px-6 py-2.5 rounded-xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white text-sm font-semibold hover:bg-[#0A84FF]/40 transition-colors"
            >
              Back to lobby
            </button>
          </GlassPanel>
        </div>
      ) : (
        <>
          <div className="relative z-10 w-full max-w-2xl">
            <div className="flex justify-center mb-6">
              <PlayerArea
                name="Opponent"
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

            <div className="relative mx-auto">
              <div className="absolute inset-0 rounded-[48px] bg-[#2D5C3F]/20 blur-xl" />
              <div
                className={cn(
                  "relative rounded-[48px] border-2 border-white/[0.12] overflow-hidden",
                  "shadow-[0_0_80px_rgba(45,92,63,0.2),0_20px_60px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.08)]",
                  "py-8 px-6"
                )}
                style={{ background: "radial-gradient(ellipse at center, #2D5C3F 0%, #1a3a28 100%)" }}
              >
                <div className="relative flex justify-center mb-6">
                  <GlassPanel variant="elevated" shimmer className="px-6 py-3 animate-float">
                    <div className="flex items-center gap-2.5">
                      <Coins className="w-5 h-5 text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
                      <span className="text-xs text-white/70 uppercase tracking-wider-xl font-semibold">Pot</span>
                      <span className="text-xl font-mono font-bold text-white">
                        {gameState.pot.toLocaleString()}
                      </span>
                    </div>
                  </GlassPanel>
                </div>
                <div className="relative flex justify-center gap-3 md:gap-4">
                  {gameState.communityCards.map((card, i) => (
                    <PlayingCard key={i} card={card ?? undefined} delay={i * 150} flipReveal={!!card} />
                  ))}
                </div>
                <div className="relative flex justify-center mt-6">
                  <div className="px-4 py-1.5 rounded-full bg-black/20 border border-white/[0.06]">
                    <span className="text-xs text-white/60 font-medium">{gameState.message}</span>
                  </div>
                </div>
              </div>
            </div>

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

          {gameState.handOver && (
            <div className="relative z-10">
              <div className="px-4 py-2 rounded-full bg-black/20 border border-white/[0.06]">
                <span className="text-xs text-white/60">Next hand in a moment…</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
