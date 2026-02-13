"use client"

import { useState, useCallback, useEffect } from "react"
import { createMpGame, joinMpGame, getMpState, sendMpAction } from "@/lib/api-client"
import { transformMultiplayerToReact, parseLegalActions } from "@/hooks/use-poker-game"
import type { MultiplayerBackendState } from "@/lib/types"
import type { ReactGameState } from "@/lib/types"
import { GlassPanel } from "@/components/poker/glass-panel"
import { PlayingCard } from "@/components/poker/playing-card"
import { PlayerArea } from "@/components/poker/player-area"
import { ActionBar } from "@/components/poker/action-bar"
import { Coins } from "lucide-react"

function MpPanel({
  title,
  gameState,
  onAction,
  loading,
}: {
  title: string
  gameState: ReactGameState | null
  onAction: (action: string, amount?: number) => void
  loading: boolean
}) {
  if (!gameState) {
    return (
      <GlassPanel className="p-6 w-full">
        <p className="text-sm text-muted-foreground">{title} — Loading...</p>
      </GlassPanel>
    )
  }

  const legalActions = parseLegalActions(gameState.legalActions)

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <GlassPanel variant="subtle" className="px-4 py-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          Blinds {gameState.blinds.small}/{gameState.blinds.big} · Wins: {gameState.wins.player} / {gameState.wins.bot}
        </span>
      </GlassPanel>
      <GlassPanel className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Pot</span>
          <span className="flex items-center gap-1 font-mono font-semibold">
            <Coins className="w-4 h-4 text-[#FFB800]" />
            {gameState.pot}
          </span>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {gameState.communityCards.map((card, i) => (
            <PlayingCard key={i} card={card ?? undefined} delay={i * 50} flipReveal={!!card} />
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">{gameState.message}</p>
        <div className="flex justify-center">
          <PlayerArea
            name="Opponent"
            chips={gameState.opponentChips}
            cards={gameState.opponentCards}
            isActive={!gameState.isPlayerTurn && !gameState.handOver}
            isCurrentUser={gameState.handOver}
            position="top"
            bet={gameState.opponentBet}
            isDealer={!gameState.isPlayerDealer}
          />
        </div>
        <div className="flex justify-center">
          <PlayerArea
            name="You"
            chips={gameState.playerChips}
            cards={gameState.playerCards}
            isActive={gameState.isPlayerTurn}
            isCurrentUser={true}
            position="bottom"
            bet={gameState.playerBet}
            isDealer={gameState.isPlayerDealer}
          />
        </div>
        {gameState.isPlayerTurn && !gameState.handOver && (
          <ActionBar
            callAmount={gameState.callAmount}
            minRaise={legalActions.minRaise}
            maxRaise={Math.min(legalActions.maxRaise, gameState.playerChips)}
            playerChips={gameState.playerChips}
            pot={gameState.pot}
            onAction={onAction}
            canCheck={legalActions.canCheck}
          />
        )}
      </GlassPanel>
      {loading && (
        <div className="text-xs text-muted-foreground text-center">Processing...</div>
      )}
    </div>
  )
}

export default function DevMpPage() {
  const [gameToken, setGameToken] = useState<string | null>(null)
  const [state0, setState0] = useState<MultiplayerBackendState | null>(null)
  const [state1, setState1] = useState<MultiplayerBackendState | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<0 | 1 | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refetchBoth = useCallback(async (token: string) => {
    const [s0, s1] = await Promise.all([getMpState(token, 0), getMpState(token, 1)])
    setState0(s0)
    setState1(s1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    createMpGame()
      .then(({ game_token }) => {
        if (cancelled) return
        setGameToken(game_token)
        return joinMpGame(game_token).then((res) => ({ res, game_token }))
      })
      .then(({ res, game_token }) => {
        if (cancelled) return
        setState1(res.state)
        return refetchBoth(game_token)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to start")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
  }, [refetchBoth])


  const handleAction0 = useCallback(
    async (action: string, amount?: number) => {
      if (!gameToken) return
      setActionLoading(0)
      try {
        const next = await sendMpAction(gameToken, 0, action, amount)
        setState0(next)
        const s1 = await getMpState(gameToken, 1)
        setState1(s1)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed")
      } finally {
        setActionLoading(null)
      }
    },
    [gameToken]
  )

  const handleAction1 = useCallback(
    async (action: string, amount?: number) => {
      if (!gameToken) return
      setActionLoading(1)
      try {
        const next = await sendMpAction(gameToken, 1, action, amount)
        setState1(next)
        const s0 = await getMpState(gameToken, 0)
        setState0(s0)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed")
      } finally {
        setActionLoading(null)
      }
    },
    [gameToken]
  )

  const reactState0 = state0 ? transformMultiplayerToReact(state0, 0) : null
  const reactState1 = state1 ? transformMultiplayerToReact(state1, 1) : null

  if (loading && !gameToken) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
        <GlassPanel className="px-8 py-6">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white">Creating game and joining...</p>
        </GlassPanel>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Dev: Two-Player Multiplayer (REST)</h1>
          {gameToken && (
            <GlassPanel variant="subtle" className="px-4 py-2">
              <span className="text-xs text-muted-foreground">Game code: </span>
              <span className="font-mono font-semibold">{gameToken}</span>
            </GlassPanel>
          )}
        </div>
        {error && (
          <GlassPanel className="px-4 py-3 bg-red-500/20 border-red-500/40">
            <p className="text-red-200 text-sm">{error}</p>
          </GlassPanel>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MpPanel
            title="Player 0"
            gameState={reactState0}
            onAction={handleAction0}
            loading={actionLoading === 0}
          />
          <MpPanel
            title="Player 1"
            gameState={reactState1}
            onAction={handleAction1}
            loading={actionLoading === 1}
          />
        </div>
      </div>
    </main>
  )
}
