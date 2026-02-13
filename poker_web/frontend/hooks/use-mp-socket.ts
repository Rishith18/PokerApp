"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { transformMultiplayerToReact } from "./use-poker-game"
import type { MultiplayerBackendState } from "@/lib/types"
import type { ReactGameState } from "@/lib/types"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export type MpSocketState = {
  connected: boolean
  roomCode: string | null
  seat: number | null
  gameState: ReactGameState | null
  matchEndReason: string | null
  opponentReconnectSeconds: number | null
  error: string | null
  isActionPending: boolean
}

export function useMpSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [seat, setSeat] = useState<number | null>(null)
  const [gameState, setGameState] = useState<ReactGameState | null>(null)
  const [matchEndReason, setMatchEndReason] = useState<string | null>(null)
  const [opponentReconnectSeconds, setOpponentReconnectSeconds] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isActionPending, setIsActionPending] = useState(false)
  const roomCodeRef = useRef<string | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingGameStateRef = useRef<ReactGameState | null>(null)

  const SHOWDOWN_DELAY_MS = 3000

  useEffect(() => {
    const s = io(WS_URL, { transports: ["websocket", "polling"], autoConnect: true })
    s.on("connect", () => {
      setConnected(true)
      setError(null)
      if (roomCodeRef.current) {
        s.emit("reconnect_sync", { room_code: roomCodeRef.current })
      }
    })
    s.on("disconnect", (reason) => {
      setConnected(false)
    })
    s.on("connect_error", (err) => {
      setError(err.message || "Connection failed")
    })
    s.on("room_created", (data: { room_code: string }) => {
      setRoomCode(data.room_code)
      roomCodeRef.current = data.room_code
      setSeat(0)
      setError(null)
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("mp_room_code", data.room_code)
        } catch (_) {}
      }
    })
    s.on("room_joined", (data: { seat: number; room_code: string }) => {
      setRoomCode(data.room_code)
      roomCodeRef.current = data.room_code
      setSeat(data.seat)
      setError(null)
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("mp_room_code", data.room_code)
        } catch (_) {}
      }
    })
    s.on("room_error", (data: { message: string }) => {
      setError(data.message || "Room error")
    })
    s.on("opponent_joined", () => {
      setError(null)
    })
    s.on("match_start", () => {
      setMatchEndReason(null)
      setError(null)
    })
    s.on("game_state_update", (data: MultiplayerBackendState & { waiting_for_opponent?: boolean; seat?: number }) => {
      if (data.waiting_for_opponent && (data.seat == null || data.seat === undefined)) {
        setGameState(null)
        pendingGameStateRef.current = null
        if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current)
        showdownTimerRef.current = null
        return
      }
      const mySeat = typeof data.seat === "number" ? data.seat : seat
      if (typeof mySeat !== "number" || (mySeat !== 0 && mySeat !== 1)) return
      if (typeof data.seat === "number") setSeat(data.seat)
      const reactState = transformMultiplayerToReact(data as MultiplayerBackendState, mySeat as 0 | 1)
      setIsActionPending(false)

      if (reactState.handOver) {
        setGameState(reactState)
        pendingGameStateRef.current = null
        if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current)
        showdownTimerRef.current = setTimeout(() => {
          showdownTimerRef.current = null
          if (pendingGameStateRef.current) {
            setGameState(pendingGameStateRef.current)
            pendingGameStateRef.current = null
          }
        }, SHOWDOWN_DELAY_MS)
      } else {
        if (showdownTimerRef.current) {
          pendingGameStateRef.current = reactState
        } else {
          setGameState(reactState)
        }
      }
    })
    s.on("action_ack", () => {
      // State will follow in game_state_update
    })
    s.on("action_rejected", (data: { message?: string }) => {
      setError(data.message || "Action rejected")
      setIsActionPending(false)
    })
    s.on("opponent_disconnected", (data: { timeout_seconds?: number }) => {
      const sec = data?.timeout_seconds ?? 90
      setOpponentReconnectSeconds(sec)
      if (countdownRef.current) clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        setOpponentReconnectSeconds((prev) => {
          if (prev == null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            countdownRef.current = null
            return null
          }
          return prev - 1
        })
      }, 1000)
    })

    s.on("match_end", (data: { reason?: string; winner?: number }) => {
      setMatchEndReason(data.reason || "match_end")
      setGameState(null)
      setOpponentReconnectSeconds(null)
      pendingGameStateRef.current = null
      if (showdownTimerRef.current) {
        clearTimeout(showdownTimerRef.current)
        showdownTimerRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      roomCodeRef.current = null
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("mp_room_code")
        } catch (_) {}
      }
    })
    setSocket(s)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current)
      s.removeAllListeners()
      s.disconnect()
    }
  }, [])

  useEffect(() => {
    if (seat !== null && gameState) {
      // keep seat in sync when we get state before seat was set
    }
  }, [seat, gameState])

  const createRoom = useCallback(() => {
    if (!socket || !connected) {
      setError("Not connected")
      return
    }
    setError(null)
    setGameState(null)
    setMatchEndReason(null)
    setRoomCode(null)
    setSeat(null)
    roomCodeRef.current = null
    socket.emit("create_room", {})
  }, [socket, connected])

  const joinRoom = useCallback(
    (code: string) => {
      if (!socket || !connected) {
        setError("Not connected")
        return
    }
      setError(null)
      setGameState(null)
      setMatchEndReason(null)
      socket.emit("join_room", { room_code: code.trim().toUpperCase() })
    },
    [socket, connected]
  )

  const sendAction = useCallback(
    (action: string, amount?: number) => {
      if (!socket || !connected) return
      setIsActionPending(true)
      setError(null)
      socket.emit("player_action", { action: action.toLowerCase(), amount })
    },
    [socket, connected]
  )

  const leaveAndGoToLobby = useCallback(() => {
    setRoomCode(null)
    setSeat(null)
    setGameState(null)
    setMatchEndReason(null)
    roomCodeRef.current = null
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("mp_room_code")
      } catch (_) {}
    }
  }, [])

  return {
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
  }
}
