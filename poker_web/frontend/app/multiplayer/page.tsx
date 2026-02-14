"use client"

import { useState } from "react"
import Link from "next/link"
import { useMpSocket } from "@/hooks/use-mp-socket"
import { PokerTableMultiplayer } from "@/components/poker/poker-table-multiplayer"
import { GlassPanel } from "@/components/poker/glass-panel"

export default function MultiplayerPage() {
  const {
    connected,
    roomCode,
    seat,
    gameState,
    matchEndReason,
    opponentReconnectSeconds,
    error,
    isActionPending,
    createRoom,
    joinRoom,
    sendAction,
    leaveAndGoToLobby,
  } = useMpSocket()

  const [joinCode, setJoinCode] = useState("")

  if (gameState && !matchEndReason) {
    return (
      <PokerTableMultiplayer
        gameState={gameState}
        onAction={sendAction}
        isLoading={isActionPending}
        error={error}
        matchEndReason={null}
        opponentReconnectSeconds={opponentReconnectSeconds}
        onBackToLobby={leaveAndGoToLobby}
        connected={connected}
      />
    )
  }

  if (matchEndReason) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
        <GlassPanel className="px-8 py-6 max-w-md text-center">
          <p className="text-white font-medium">
            {matchEndReason === "opponent_left" ? "Opponent left the game." : "Match ended."}
          </p>
          <button
            type="button"
            onClick={leaveAndGoToLobby}
            className="mt-4 px-6 py-2.5 rounded-xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white text-sm font-semibold hover:bg-[#0A84FF]/40 transition-colors"
          >
            Back to lobby
          </button>
        </GlassPanel>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-white text-center">Heads-up Poker</h1>

        {!connected && (
          <GlassPanel className="px-4 py-3 bg-amber-500/20 border-amber-500/40">
            <p className="text-amber-200 text-sm">Connecting to server…</p>
          </GlassPanel>
        )}

        {error && (
          <GlassPanel className="px-4 py-3 bg-red-500/20 border-red-500/40">
            <p className="text-red-200 text-sm">{error}</p>
            {(error.includes("log in") || error.includes("Authentication")) && (
              <Link
                href="/login"
                className="mt-2 inline-block text-sm font-medium text-[#0A84FF] hover:underline"
              >
                Log in to play
              </Link>
            )}
          </GlassPanel>
        )}

        {roomCode && seat !== null && !gameState && (
          <GlassPanel className="px-6 py-4 text-center">
            <p className="text-white font-medium">
              {seat === 0 ? "Waiting for opponent to join…" : "Starting game…"}
            </p>
            <p className="mt-2 text-sm text-white/70 font-mono">{roomCode}</p>
            <p className="mt-1 text-xs text-white/50">Share this code with your opponent</p>
          </GlassPanel>
        )}

        {!roomCode && (
          <div className="space-y-4">
            <GlassPanel className="p-6 space-y-4">
              <button
                type="button"
                onClick={createRoom}
                disabled={!connected}
                className="w-full py-3.5 rounded-xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white font-semibold hover:bg-[#0A84FF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create game
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <span className="relative flex justify-center text-xs text-white/50">or</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Room code"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 font-mono uppercase"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={() => joinRoom(joinCode)}
                  disabled={!connected || !joinCode.trim()}
                  className="px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Join
                </button>
              </div>
            </GlassPanel>
          </div>
        )}
      </div>
    </main>
  )
}
