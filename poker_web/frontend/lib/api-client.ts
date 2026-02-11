/**
 * API Client for communicating with Flask backend
 * Handles HTTP requests, card format conversion, and error handling
 */

import type { CardData } from "@/components/poker/playing-card"
import type { BackendGameState } from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

/**
 * Convert backend card format to React CardData format
 * Backend: "As" (Ace of Spades), "Kh" (King of Hearts), "Td" (Ten of Diamonds)
 * React: {suit: "spades", rank: "A"}
 */
export function parseBackendCard(cardStr: string): CardData | null {
  if (!cardStr || cardStr.length < 2) return null

  const rankChar = cardStr[0]
  const suitChar = cardStr[1]

  // Convert rank
  let rank: CardData["rank"]
  if (rankChar === "T") {
    rank = "10"
  } else {
    rank = rankChar as CardData["rank"]
  }

  // Convert suit
  const suitMap: Record<string, CardData["suit"]> = {
    s: "spades",
    h: "hearts",
    d: "diamonds",
    c: "clubs",
  }

  const suit = suitMap[suitChar]
  if (!suit) return null

  return { rank, suit }
}

/**
 * Convert React CardData format to backend format
 * React: {suit: "spades", rank: "A"}
 * Backend: "As"
 */
export function formatCardForBackend(card: CardData): string {
  const suitMap: Record<CardData["suit"], string> = {
    spades: "s",
    hearts: "h",
    diamonds: "d",
    clubs: "c",
  }

  const rank = card.rank === "10" ? "T" : card.rank
  const suit = suitMap[card.suit]

  return `${rank}${suit}`
}

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `API Error (${response.status}): ${errorText || response.statusText}`
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ${endpoint}: ${error.message}`)
    }
    throw new Error(`Failed to fetch ${endpoint}`)
  }
}

/**
 * Start a new poker hand
 */
export async function startNewHand(): Promise<BackendGameState> {
  return apiRequest<BackendGameState>("/api/game/new", {
    method: "POST",
  })
}

/**
 * Send a player action to the backend
 */
export async function sendPlayerAction(
  action: string,
  amount?: number
): Promise<BackendGameState> {
  const body: { action: string; amount?: number } = { action }
  if (amount !== undefined) {
    body.amount = amount
  }

  return apiRequest<BackendGameState>("/api/game/action", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Get current game state from backend
 */
export async function getGameState(): Promise<BackendGameState> {
  return apiRequest<BackendGameState>("/api/game/state", {
    method: "GET",
  })
}

/**
 * Health check to verify backend is running
 */
export async function healthCheck(): Promise<{ status: string; message: string }> {
  return apiRequest<{ status: string; message: string }>("/api/health", {
    method: "GET",
  })
}
