/**
 * TypeScript type definitions for poker game state
 * Maps backend API responses to React component state
 */

import type { CardData } from "@/components/poker/playing-card"

/**
 * Backend game state format (matches Flask API response)
 */
export interface BackendGameState {
  pot: number
  stacks: {
    player: number
    bot: number
  }
  round: "preflop" | "flop" | "turn" | "river"
  board: string[] // Card strings like ["As", "Kh", "Qc"]
  player_cards: string[] // Player's hole cards
  bot_cards: string[] | null // null until showdown
  legal_actions: string[] // e.g., ["Fold", "Check", "Raise(5.0)"]
  last_action: {
    actor: "player" | "bot"
    action: string
    amount: number | null
  } | null
  winner: "player" | "bot" | "split" | null
  hand_over: boolean
  wins: {
    player: number
    bot: number
  }
  current_player: "player" | "bot" | null
  can_act: boolean
  call_amount?: number
  small_blind?: number
  big_blind?: number
  all_in_runout?: Array<{
    street: string
    board: string[]
  }>
}

/**
 * React component game state format
 */
export interface ReactGameState {
  phase: "preflop" | "flop" | "turn" | "river" | "showdown"
  pot: number
  communityCards: (CardData | null)[]
  playerCards: CardData[]
  opponentCards: (CardData | null)[]
  playerChips: number
  opponentChips: number
  currentBet: number
  playerBet: number
  opponentBet: number
  isPlayerTurn: boolean
  isPlayerDealer: boolean
  callAmount: number
  blinds: {
    small: number
    big: number
  }
  message: string
  handOver: boolean
  winner: "player" | "bot" | "split" | null
  wins: {
    player: number
    bot: number
  }
  legalActions: string[]
  allInRunout?: Array<{
    street: string
    board: CardData[]
  }>
}

/**
 * Parsed legal actions for UI
 */
export interface ParsedLegalActions {
  canFold: boolean
  canCheck: boolean
  canCall: boolean
  callAmount: number
  canRaise: boolean
  minRaise: number
  maxRaise: number
}
