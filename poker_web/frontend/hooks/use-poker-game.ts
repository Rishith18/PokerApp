/**
 * Custom React hook for poker game state management
 * Handles API calls, state transformations, and game flow
 */

import { useState, useCallback, useEffect } from "react"
import { startNewHand as apiStartNewHand, sendPlayerAction, parseBackendCard } from "@/lib/api-client"
import type { BackendGameState, ReactGameState, ParsedLegalActions } from "@/lib/types"
import type { CardData } from "@/components/poker/playing-card"

/**
 * Transform backend game state to React component state
 */
function transformBackendToReact(backend: BackendGameState): ReactGameState {
  // Parse cards
  const playerCards = backend.player_cards.map(parseBackendCard).filter((c): c is CardData => c !== null)

  const opponentCards: (CardData | null)[] = backend.bot_cards
    ? backend.bot_cards.map(parseBackendCard)
    : [null, null]

  const communityCards: (CardData | null)[] = Array(5)
    .fill(null)
    .map((_, i) => (backend.board[i] ? parseBackendCard(backend.board[i]) : null))

  // Determine current bets (estimate from legal actions and pot)
  // This is a simplification - ideally backend would provide this
  const currentBet = parseBetFromActions(backend.legal_actions)

  // Determine phase (handle showdown separately)
  let phase: ReactGameState["phase"] = backend.round
  if (backend.hand_over || backend.winner !== null) {
    phase = "showdown"
  }

  // Create message based on game state
  let message = "Your turn"
  if (!backend.can_act) {
    message = "Bot is thinking..."
  }
  if (backend.hand_over) {
    if (backend.winner === "player") {
      message = `You won ${backend.pot}!`
    } else if (backend.winner === "bot") {
      message = `Bot won ${backend.pot}`
    } else {
      message = "Split pot"
    }
  }
  if (backend.last_action) {
    const actor = backend.last_action.actor === "player" ? "You" : "Bot"
    const action = backend.last_action.action
    const amount = backend.last_action.amount
    if (amount != null && !/\d/.test(action)) {
      message = `${actor}: ${action} ${amount}`
    } else {
      message = `${actor}: ${action}`
    }
  }

  // Transform all_in_runout if present
  const allInRunout = backend.all_in_runout?.map(streetData => ({
    street: streetData.street,
    board: streetData.board.map(parseBackendCard).filter((c): c is CardData => c !== null),
  }))

  return {
    phase,
    pot: backend.pot,
    communityCards,
    playerCards,
    opponentCards,
    playerChips: backend.stacks.player,
    opponentChips: backend.stacks.bot,
    currentBet,
    playerBet: 0, // Backend doesn't provide this, estimate from last action
    opponentBet: 0,
    isPlayerTurn: backend.can_act,
    isPlayerDealer: true, // TODO: Track dealer button
    callAmount: backend.call_amount ?? 0,
    blinds: {
      small: backend.small_blind ?? 0.5,
      big: backend.big_blind ?? 1,
    },
    message,
    handOver: backend.hand_over,
    winner: backend.winner,
    wins: backend.wins,
    legalActions: backend.legal_actions,
    allInRunout,
  }
}

/**
 * Parse current bet amount from legal actions array
 */
function parseBetFromActions(legalActions: string[]): number {
  for (const action of legalActions) {
    if (action.startsWith("Call")) {
      // Extract number from "Call" or "Raise(amount)"
      const match = action.match(/\d+\.?\d*/)
      if (match) {
        return parseFloat(match[0])
      }
    }
  }
  return 0
}

/**
 * Parse legal actions into UI-friendly format
 */
export function parseLegalActions(legalActions: string[]): ParsedLegalActions {
  const canFold = legalActions.some(a => a.trim().toLowerCase() === "fold")
  const canCheck = legalActions.some(a => a.trim().toLowerCase() === "check")

  const callAction = legalActions.find(a => a.trim().toLowerCase().startsWith("call"))
  const canCall = !!callAction
  const callAmount = canCall ? parseBetFromActions(legalActions) : 0

  const raiseActions = legalActions.filter(a => /^raise/i.test(a.trim()))
  const canRaise = raiseActions.length > 0

  let minRaise = 20 // Default min raise
  let maxRaise = 5000 // Default max raise

  if (raiseActions.length > 0) {
    const amounts = raiseActions
      .map(a => {
        const withParens = a.match(/raise\s*\((\d+\.?\d*)\)/i)
        const withSpace = a.match(/raise\s+(\d+\.?\d*)/i)
        const match = withParens ?? withSpace
        return match ? parseFloat(match[1]) : 0
      })
      .filter(a => a > 0)

    if (amounts.length > 0) {
      minRaise = Math.min(...amounts)
      maxRaise = Math.max(...amounts)
    }
  }

  return {
    canFold,
    canCheck,
    canCall,
    callAmount,
    canRaise,
    minRaise,
    maxRaise,
  }
}

/**
 * Main hook for poker game state
 */
export function usePokerGame() {
  const [gameState, setGameState] = useState<ReactGameState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Start a new poker hand
   */
  const startNewHand = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const backendState = await apiStartNewHand()
      const reactState = transformBackendToReact(backendState)
      setGameState(reactState)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start new hand"
      setError(errorMessage)
      console.error("Error starting new hand:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Send player action to backend
   */
  const handlePlayerAction = useCallback(async (action: string, amount?: number) => {
    if (!gameState || !gameState.isPlayerTurn) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const backendState = await sendPlayerAction(action, amount)
      const reactState = transformBackendToReact(backendState)
      setGameState(reactState)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process action"
      setError(errorMessage)
      console.error("Error processing action:", err)
    } finally {
      setIsLoading(false)
    }
  }, [gameState])

  /**
   * Initialize game on mount
   */
  useEffect(() => {
    startNewHand()
  }, [startNewHand])

  return {
    gameState,
    isLoading,
    error,
    startNewHand,
    handlePlayerAction,
  }
}
